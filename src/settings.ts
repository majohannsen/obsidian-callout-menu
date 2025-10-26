import { App, PluginSettingTab, Setting } from "obsidian";
import CalloutMenuPlugin from "./main";
import { i18n } from "./localization";


export interface CMSettings {
    types: string;
    metaTypes: string;
}

export const DEFAULT_SETTINGS: CMSettings = {
    types: "note, info, tip",
    metaTypes: "no-icon, no-title",
}


export class CMSettingTab extends PluginSettingTab {
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