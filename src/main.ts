import {
	App,
	Plugin,
	PluginSettingTab,
	FuzzySuggestModal,
	FuzzyMatch,
	Setting,
	Menu,
	MenuItem,
	Platform,
	getLanguage,
} from "obsidian";
import MenuManager from 'src/MenuManager';
import { i18n } from './localization';



interface CMSettings {
	types: string;
	metaTypes: string;
}

const DEFAULT_SETTINGS: CMSettings = {
	types: "note, info, tip",
	metaTypes: "no-icon, no-title",
};

export default class CalloutMenuPlugin extends Plugin {
	settings: CMSettings;

	async onload() {

		let locale = "en"
		if (getLanguage) {
			locale = getLanguage()
		} else {
			locale = window.localStorage.language
		}
		
    	i18n.setLocale(locale);

		await this.loadSettings();
		this.addSettingTab(new CMSettingTab(this.app, this));


		if (Platform.isDesktop) {
			this.registerDomEvent(window, "contextmenu", (e: MouseEvent) => {
				
				if (e.button == 2) {
					let target = e.target as HTMLElement
					const calloutEl = target.closest(".cm-callout")
					if (calloutEl) {
						this.createCalloutMenu(e);
					}
				}
			});
		}


		
		

		if (Platform.isMobile) {
		
			this.registerDomEvent(window, "touchstart", (e: TouchEvent) => {
				let target = e.target as HTMLElement
				const calloutEl = target.closest(".cm-callout")
				if (calloutEl) {
					this.createCalloutMenu(e)
					
				}
			});
		}

		
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getPath(e: any) {
		const getPathFromNode: any = (node: Node) => {
			const getIndex = (node: Node) => {
				const parent = node.parentElement || node.parentNode;
				let i = -1;
				let child;
				while (parent && (child = parent.childNodes[++i]))
					if (child == node) return i;
				return -1;
			};
			let parent,
				path = [];
			const index = getIndex(node);
			(parent = node.parentElement || node.parentNode) &&
				(path = getPathFromNode(parent));
			index > -1 && path.push(node);
			return path;
		};

		let path = e.path;
		if (!path) {
			path = e.composedPath();
		}
		if (!path || path.length == 0) {
			path = getPathFromNode(e.target);
		}
		return path;
	}

	createCalloutMenu(e: Event) {
		let target = e.target as HTMLElement

		const calloutEl = target.closest(".cm-callout") as any
		const callout = calloutEl.querySelector(".callout") as HTMLElement
		const link = target.closest("a") as HTMLAnchorElement

		const calloutNames = this.settings.types
			.split(",")
			.map((m) => m.trim());
		const calloutMetadata = this.settings.metaTypes
			.split(",")
			.map((m) => m.trim());
		const calloutNamesDafault = [
			"note",
			"info",
			"important",
			"tip",
			"success",
			"question",
			"warning",
			"example",
			"quote",
			"abstract",
			"summary",
			"tldr",
			"todo",
			"hint",
			"check",
			"done",
			"question",
			"faq",
			"help",
			"caution",
			"attention",
			"failure",
			"fail",
			"missing",
			"danger",
			"error",
			"bug",
			"example",
			"cite",
		];

		
		const calloutClasses = callout.classList;

		


		const fold =
			callout.getAttribute(
				"data-callout-fold"
			);
		const widget = calloutEl.cmView.widget;
		const editor = widget.editor.editor;
		const lineNumStart = editor.offsetToPos(widget.start).line;
		const lineNumEnd = editor.offsetToPos(widget.end).line;
		const line = editor.getLine(lineNumStart);

		const lines: string[] = [];
		for (let l = lineNumStart; l <= lineNumEnd; l++) {
			lines.push(l);
		}

		const calloutDef = line.replace(/(.*?])(.*)/, "$1");
		const calloutType = calloutEl.cmView.widget
			.getType()
			.replace(/([^|]+)(.*)/, "$1");
		let addingMetadata = [...calloutMetadata];

		const existingMetadata = calloutMetadata.filter(
			(m) =>
				calloutDef.includes("|" + m + "|") ||
				calloutDef.includes("|" + m + "]")
		);
		const notExistingMetadata = addingMetadata.filter(
			(m) =>
				!calloutDef.includes("|" + m + "|") &&
				!calloutDef.includes("|" + m + "]")
		);




		let menuManager = new MenuManager()

		menuManager.setMenuClassName("callout-menu")

		

		

		

		menuManager.addItemAfter(['edit'], i18n.t("copyContent"), (item) =>
			item.setTitle(i18n.t("copyContent"))
				.setSection('edit')
				.onClick(() => {
				lines.shift()
				let content = ""
				for (const l of lines) {
					const line = editor.getLine(l);
					let newLine = line.replace(">", "");
					newLine = newLine.replace(/^ /, "");
					content += newLine + "\n"
				}
				content = content.trim()
				navigator.clipboard.writeText(content)
			})
		);




		

		if (link && link.className){

			

			

			if (link.className.includes("internal-link")) {		
				menuManager.addItemAfter(['edit'], i18n.t("copyLinkPath"), (item) =>
					item.setTitle(i18n.t("copyLinkPath"))
					.setSection('clipboard')
					.onClick(() => {
						let linkPath = link.getAttribute("data-href") || ""
						navigator.clipboard.writeText(linkPath)
					})
				);
			}
			
		}

		




		// Добавить или убрать сворачивание
		if (calloutClasses.contains("is-collapsible") && fold == "-") {
			menuManager.addItemAfter(['edit'], i18n.t("expanded"), (item) => {
				item.setTitle(i18n.t("expanded"))
					.setIcon("plus")
					.setSection('collapse')
					.onClick(() => {
						editor.setLine(
							lineNumStart,
							line.replace("]-", "]+")
						);
					});
			});
			menuManager.addItemAfter(['edit'], i18n.t("removeCollapsing"), (item) => {
				item.setTitle(i18n.t("removeCollapsing"))
					.setIcon("x")
					.setSection('collapse')
					.onClick(() => {
						editor.setLine(
							lineNumStart,
							line.replace("]-", "]")
						);
					});
			});
		} else if (
			calloutClasses.contains("is-collapsible") &&
			fold == "+"
		) {
			menuManager.addItemAfter(['edit'], i18n.t("collapsed"), (item) => {
				item.setTitle(i18n.t("collapsed"))
					.setIcon("minus")
					.setSection('collapse')
					.onClick(() => {
						editor.setLine(
							lineNumStart,
							line.replace("]+", "]-")
						);
					});
			});
			menuManager.addItemAfter(['edit'], i18n.t("removeCollapsing"), (item) => {
				item.setTitle(i18n.t("removeCollapsing"))
					.setIcon("x")
					.setSection('collapse')
					.onClick(() => {
						editor.setLine(
							lineNumStart,
							line.replace("]+", "]")
						);
					});
			});
		} else {
			menuManager.addItemAfter(['edit'], i18n.t("collapsed"), (item) => {
				item.setTitle(i18n.t("collapsed"))
					.setIcon("minus")
					.setSection('collapse')
					.onClick(() => {
						editor.setLine(
							lineNumStart,
							line.replace("]", "]-")
						);
					});
			});
			menuManager.addItemAfter(['edit'], i18n.t("expanded"), (item) => {
				item.setTitle(i18n.t("expanded"))
					.setIcon("plus")
					.setSection('collapse')
					.onClick(() => {
						editor.setLine(
							lineNumStart,
							line.replace("]", "]+")
						);
					});
			});
		}




		if (Platform.isMobile) {
			for (const calloutName of calloutNames) {

				const title =
					calloutName[0].toUpperCase() +
					calloutName
						.slice(1, calloutName.length)
						.replace("|", " | ");

				menuManager.addItemAfter("type", title, (item) => {
					item.setTitle(title)
						.setSection("custom-type")
						.onClick(() => {
							calloutEl.cmView.widget.updateType(calloutName);
						})
						.setChecked(calloutType == calloutName);
				});
			}

			menuManager.addSeparator()

			if (notExistingMetadata.length > 0) {
				for (const metaName of notExistingMetadata) {
					const title =
						metaName[0].toUpperCase() +
						metaName
							.slice(1, metaName.length)
							.replace("|", " | ");
					menuManager.addItemAfter("custom-type", title, (item) => {
						item.setTitle(title)
							.setSection("custom-type-metadata")
							.setIcon("plus")
							.onClick(() => {
								editor.setLine(
									lineNumStart,
									line.replace("]", "|" + metaName + "]")
								);
							});
					});
				}
			}

			

			if (existingMetadata.length > 0) {
				for (const metaName of existingMetadata) {
					const title =
						metaName[0].toUpperCase() +
						metaName
							.slice(1, metaName.length)
							.replace("|", " | ");
							
					menuManager.addItemAfter("custom-type", title, (item) => {
						item.setTitle(title)
							.setSection("custom-type-metadata")
							.setIcon("minus")
							.onClick(() => {
								editor.setLine(
									lineNumStart,
									line.replace("|" + metaName, "")
								);
							});
					});
				}
			}










		} else {
			menuManager.addItemAfter("type", i18n.t("calloutType"), (item) => {
				item.setTitle(i18n.t("calloutType"))
				.setSection('custom-type')
				//@ts-ignore
				const sub = item.setSubmenu();
				sub.dom.classList.add("callout-menu");
				for (const calloutName of calloutNames) {
					sub.addItem((item: MenuItem) => {
						const title =
							calloutName[0].toUpperCase() +
							calloutName
								.slice(1, calloutName.length)
								.replace("|", " | ");
						item.setTitle(title)
							.onClick(() => {
								calloutEl.cmView.widget.updateType(
									calloutName
								);
							})
							.setChecked(calloutType == calloutName);
					});
				}

				sub.addItem((item: MenuItem) => {
					const title = i18n.t("other");
					item.setTitle(title).onClick(async () => {
						const defCalloutName = await this.calloutSuggester(
							calloutNamesDafault
						);
						calloutEl.cmView.widget.updateType(defCalloutName);
					});
				});

				
			});

			if (notExistingMetadata.length > 0) {
				menuManager.addItemAfter("type", i18n.t("addMetadata"), (item) => {
					item.setTitle(i18n.t("addMetadata"))
					.setSection('custom-type')
					//@ts-ignore
					const sub = item.setSubmenu();
					sub.dom.classList.add("callout-menu");
					for (const metaName of notExistingMetadata) {
						sub.addItem((item: MenuItem) => {
							const title =
								metaName[0].toUpperCase() +
								metaName
									.slice(1, metaName.length)
									.replace("|", " | ");
							item.setTitle(title).onClick(() => {
								editor.setLine(
									lineNumStart,
									line.replace("]", "|" + metaName + "]")
								);
							});
						});
					}
				});
			}

			if (existingMetadata.length > 0) {
				menuManager.addItem((item) => {
					item.setTitle(i18n.t("removeMetadata"))
					.setSection('custom-type')
					//@ts-ignore
					const sub = item.setSubmenu();
					sub.dom.classList.add("callout-menu");
					for (const metaName of existingMetadata) {
						sub.addItem((item: MenuItem) => {
							const title =
								metaName[0].toUpperCase() +
								metaName
									.slice(1, metaName.length)
									.replace("|", " | ");
							item.setTitle(title).onClick(() => {
								editor.setLine(
									lineNumStart,
									line.replace("|" + metaName, "")
								);
							});
						});
					}
				});
			}
		}





		menuManager.addItem((item) =>
			item
				.setTitle(i18n.t("clearFormatting"))
				.setIcon("eraser")
				.setSection("clear")
				.onClick(() => {
					for (const l of lines) {
						const line = editor.getLine(l);
						let newLine = line.replace(">", "");
						if (l == lineNumStart) {
							newLine = newLine
								.replace("]+", "]")
								.replace("]-", "]")
								.replace(/(\[.*?\])(.*)/, "$2")
								.replace(/^ /, "");
						}
						newLine = newLine.replace(/^ /, "");
						editor.setLine(l, newLine);
					}
				})
		);



		


		
	}

	async calloutSuggester(values: string[]) {
		const placeholder = i18n.t("calloutTypePlaceholder");
		const data = new Promise((resolve, reject) => {
			new Suggest(this.app, resolve, reject, values, placeholder).open();
		});
		return data;
	}

	
}

class Suggest extends FuzzySuggestModal<string> {
	resolve: any;
	reject: any;
	values: string[];
	placeholder: string;
	constructor(
		app: App,
		resolve: any,
		reject: any,
		values: string[],
		placeholder: string
	) {
		super(app);
		this.resolve = resolve;
		this.reject = reject;
		this.values = values;
		this.placeholder = placeholder;
	}
	getItems() {
		return this.values;
	}
	getItemText(val: string) {
		this.setPlaceholder(this.placeholder);
		return val;
	}
	renderSuggestion(val: FuzzyMatch<string>, el: Element) {
		const text = val.item;
		el.createEl("div", { text: text });
	}
	onChooseItem(val: string) {
		this.resolve(val);
	}
}

class CMSettingTab extends PluginSettingTab {
	plugin: CalloutMenuPlugin;

	constructor(app: App, plugin: CalloutMenuPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName(i18n.t("calloutTypes"))
			.setDesc(i18n.t("calloutTypesDesc"))
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.types)
					.onChange(async (value) => {
						this.plugin.settings.types = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(i18n.t("metadataTypes"))
			.setDesc(i18n.t("metadataTypesDesc"))
			.addTextArea((text) =>
				text
					.setValue(this.plugin.settings.metaTypes)
					.onChange(async (value) => {
						this.plugin.settings.metaTypes = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
