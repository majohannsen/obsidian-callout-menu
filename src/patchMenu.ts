import { Menu, MenuItem, Platform } from "obsidian";
import { around, dedupe } from "monkey-around";
import CalloutMenuPlugin from "./main";
import { i18n } from "./localization";
import { Suggest } from "./suggestModal";

// Map callout aliases to their base type for color lookup
const calloutAliasMap: Record<string, string> = {
	// info aliases
	info: "info",
	// note aliases
	note: "note",
	// abstract/summary/tldr
	abstract: "abstract",
	summary: "abstract",
	tldr: "abstract",
	// tip/hint/important
	tip: "tip",
	hint: "tip",
	important: "tip",
	// success/check/done
	success: "success",
	check: "success",
	done: "success",
	// question/help/faq
	question: "question",
	help: "question",
	faq: "question",
	// warning/caution/attention
	warning: "warning",
	caution: "warning",
	attention: "warning",
	// failure/fail/missing
	failure: "failure",
	fail: "failure",
	missing: "failure",
	// danger/error
	danger: "danger",
	error: "danger",
	// bug
	bug: "bug",
	// example
	example: "example",
	// quote/cite
	quote: "quote",
	cite: "quote",
	// todo
	todo: "todo",
};

// Default Obsidian callout colors (RGB values) as fallback
const defaultCalloutColors: Record<string, string> = {
	// blue
	note: "2, 122, 255",
	info: "2, 122, 255",
	todo: "2, 122, 255",
	// cyan
	abstract: "83, 223, 221",
	tip: "83, 223, 221",
	// orange
	question: "233, 151, 63",
	warning: "233, 151, 63",
	// green
	success: "68, 207, 110",
	// red
	failure: "251, 70, 76",
	danger: "251, 70, 76",
	bug: "251, 70, 76",
	// purple
	example: "168, 130, 255",
	// gray
	quote: "158, 158, 158",
};

// Default Obsidian callout icons
const defaultCalloutIcons: Record<string, string> = {
	note: "pencil",
	info: "info",
	abstract: "clipboard-list",
	summary: "clipboard-list",
	tldr: "clipboard-list",
	tip: "flame",
	hint: "flame",
	important: "flame",
	success: "check",
	check: "check",
	done: "check",
	question: "help-circle",
	help: "help-circle",
	faq: "help-circle",
	warning: "alert-triangle",
	caution: "alert-triangle",
	attention: "alert-triangle",
	failure: "x",
	fail: "x",
	missing: "x",
	danger: "zap",
	error: "zap",
	bug: "bug",
	example: "list",
	quote: "quote",
	cite: "quote",
	todo: "check-circle-2",
};

export function getCalloutIcon(calloutName: string): string {
	const lowerName = calloutName.toLowerCase();
	return defaultCalloutIcons[lowerName] || "pencil";
}

export function getCalloutColor(calloutName: string): string | null {
	const computedStyle = getComputedStyle(document.body);
	const lowerName = calloutName.toLowerCase();

	// First try the exact callout name from CSS
	let calloutColor = computedStyle
		.getPropertyValue(`--callout-${lowerName}`)
		.trim();
	if (calloutColor) {
		return calloutColor;
	}

	// Try the base type from alias map
	const baseType = calloutAliasMap[lowerName];
	if (baseType) {
		calloutColor = computedStyle
			.getPropertyValue(`--callout-${baseType}`)
			.trim();
		if (calloutColor) {
			return calloutColor;
		}
		// Use hardcoded fallback for default callouts
		if (defaultCalloutColors[baseType]) {
			return defaultCalloutColors[baseType];
		}
	}

	// Try hardcoded fallback directly
	if (defaultCalloutColors[lowerName]) {
		return defaultCalloutColors[lowerName];
	}

	return null;
}
export const patchMenu = async (plugin: CalloutMenuPlugin) => {
	plugin.uninstallCalloutMenuPatch = around(Menu.prototype, {
		showAtMouseEvent(old) {
			return dedupe("pp-patch-menu-around-key", old, function (...args) {
				const e = args[0];
				const target = e.target as HTMLElement;
				const menu = this;

				if (target.closest(".cm-callout")) {
					editCalloutMenu(plugin, menu, target);
				}

				return old && old.apply(menu, args);
			});
		},
	});
};

const calloutSuggester = async (
	plugin: CalloutMenuPlugin,
	values: string[]
) => {
	const placeholder = i18n.t("calloutTypePlaceholder");
	const data = new Promise((resolve, reject) => {
		new Suggest(plugin.app, resolve, reject, values, placeholder).open();
	});
	return data;
};

const editCalloutMenu = async (
	plugin: CalloutMenuPlugin,
	menu: Menu,
	target: HTMLElement
) => {
	//@ts-ignore
	menu?.dom?.classList.add("callout-menu");

	//@ts-ignore
	delete menu.submenuConfigs["type"];
	//@ts-ignore
	menu.items = menu.items.filter((item) => {
		return item.section != "type";
	});

	const calloutEl = target.closest(".cm-callout") as any;
	const callout = calloutEl.querySelector(".callout") as HTMLElement;
	const link = target.closest("a") as HTMLAnchorElement;

	const calloutNames = plugin.settings.types.split(",").map((m) => m.trim());
	const calloutMetadata = plugin.settings.metaTypes
		.split(",")
		.map((m) => m.trim());
	const calloutNamesDafault = [
		"note",
		"info",
		"todo",
		"tip",
		"hint",
		"important",
		"success",
		"check",
		"done",
		"question",
		"faq",
		"help",
		"warning",
		"caution",
		"attention",
		"abstract",
		"summary",
		"tldr",
		"failure",
		"fail",
		"missing",
		"danger",
		"error",
		"bug",
		"example",
		"quote",
		"cite",
	];

	const calloutClasses = callout.classList;

	const fold = callout.getAttribute("data-callout-fold");
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
	const addingMetadata = [...calloutMetadata];

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

	menu.addItem((item: MenuItem) =>
		item
			.setTitle(i18n.t("copyContent"))
			.setSection("edit")
			.onClick(() => {
				lines.shift();
				let content = "";
				for (const l of lines) {
					const line = editor.getLine(l);
					let newLine = line.replace(">", "");
					newLine = newLine.replace(/^ /, "");
					content += newLine + "\n";
				}
				content = content.trim();
				navigator.clipboard.writeText(content);
			})
	);

	if (link && link.className) {
		if (link.className.includes("internal-link")) {
			menu.addItem((item) =>
				item
					.setTitle(i18n.t("copyLinkPath"))
					.setSection("clipboard")
					.onClick(() => {
						const linkPath = link.getAttribute("data-href") || "";
						navigator.clipboard.writeText(linkPath);
					})
			);
		}
	}

	if (calloutClasses.contains("is-collapsible") && fold == "-") {
		menu.addItem((item) => {
			item.setTitle(i18n.t("expanded"))
				.setIcon("plus")
				.setSection("collapse")
				.onClick(() => {
					editor.setLine(lineNumStart, line.replace("]-", "]+"));
				});
		});
		menu.addItem((item) => {
			item.setTitle(i18n.t("removeCollapsing"))
				.setIcon("x")
				.setSection("collapse")
				.onClick(() => {
					editor.setLine(lineNumStart, line.replace("]-", "]"));
				});
		});
	} else if (calloutClasses.contains("is-collapsible") && fold == "+") {
		menu.addItem((item) => {
			item.setTitle(i18n.t("collapsed"))
				.setIcon("minus")
				.setSection("collapse")
				.onClick(() => {
					editor.setLine(lineNumStart, line.replace("]+", "]-"));
				});
		});
		menu.addItem((item) => {
			item.setTitle(i18n.t("removeCollapsing"))
				.setIcon("x")
				.setSection("collapse")
				.onClick(() => {
					editor.setLine(lineNumStart, line.replace("]+", "]"));
				});
		});
	} else {
		menu.addItem((item) => {
			item.setTitle(i18n.t("collapsed"))
				.setIcon("minus")
				.setSection("collapse")
				.onClick(() => {
					editor.setLine(lineNumStart, line.replace("]", "]-"));
				});
		});
		menu.addItem((item) => {
			item.setTitle(i18n.t("expanded"))
				.setIcon("plus")
				.setSection("collapse")
				.onClick(() => {
					editor.setLine(lineNumStart, line.replace("]", "]+"));
				});
		});
	}

	if (Platform.isMobile) {
		for (const calloutName of calloutNames) {
			const title =
				calloutName[0].toUpperCase() +
				calloutName.slice(1, calloutName.length).replace("|", " | ");

			menu.addItem((item) => {
				item.setTitle(title)
					.setSection("custom-type")
					.onClick(() => {
						calloutEl.cmView.widget.updateType(calloutName);
					})
					.setChecked(calloutType == calloutName);
			});
		}

		menu.addSeparator();

		if (notExistingMetadata.length > 0) {
			for (const metaName of notExistingMetadata) {
				const title =
					metaName[0].toUpperCase() +
					metaName.slice(1, metaName.length).replace("|", " | ");
				menu.addItem((item) => {
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
					metaName.slice(1, metaName.length).replace("|", " | ");

				menu.addItem((item) => {
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
		menu.addItem((item) => {
			item.setTitle(i18n.t("calloutType")).setSection("custom-type");
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
						.setIcon(getCalloutIcon(calloutName))
						.onClick(() => {
							calloutEl.cmView.widget.updateType(calloutName);
						})
						.setChecked(calloutType == calloutName);
					//@ts-ignore
					const itemDom = item.dom as HTMLElement;
					itemDom.dataset.calloutType = calloutName;
					// Check if this callout has a color defined
					const calloutColor = getCalloutColor(calloutName);
					if (calloutColor) {
						itemDom.style.background = `rgba(${calloutColor}, 0.2)`;
						itemDom.addEventListener("mouseenter", () => {
							itemDom.style.background = `linear-gradient(var(--background-modifier-hover), var(--background-modifier-hover)), rgba(${calloutColor}, 0.2)`;
						});
						itemDom.addEventListener("mouseleave", () => {
							itemDom.style.background = `rgba(${calloutColor}, 0.2)`;
						});
					}
				});
			}

			sub.addItem((item: MenuItem) => {
				const title = i18n.t("other");
				item.setTitle(title).onClick(async () => {
					const defCalloutName = await calloutSuggester(
						plugin,
						calloutNamesDafault
					);
					calloutEl.cmView.widget.updateType(defCalloutName);
				});
			});
		});

		if (notExistingMetadata.length > 0) {
			menu.addItem((item) => {
				item.setTitle(i18n.t("addMetadata")).setSection("custom-type");
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
			menu.addItem((item) => {
				item.setTitle(i18n.t("removeMetadata")).setSection(
					"custom-type"
				);
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

	menu.addItem((item) =>
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
};
