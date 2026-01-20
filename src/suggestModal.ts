import { App, FuzzyMatch, FuzzySuggestModal, setIcon } from "obsidian";
import { getCalloutColor, getCalloutIcon } from "./patchMenu";


export class Suggest extends FuzzySuggestModal<string> {
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
		const container = el.createEl("div", { cls: "suggestion-content" });
		container.style.display = "flex";
		container.style.alignItems = "center";
		container.style.gap = "8px";
		
		const iconEl = container.createEl("span", { cls: "suggestion-icon" });
		setIcon(iconEl, getCalloutIcon(val.item));
		
		container.createEl("span", { text: text });
		
		// Apply callout color background if available
		const itemDom = el as HTMLElement;
		const calloutName = val.item;
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
	}
	onChooseItem(val: string) {
		this.resolve(val);
	}
}