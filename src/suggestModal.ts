import { App, FuzzyMatch, FuzzySuggestModal } from "obsidian";


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
		el.createEl("div", { text: text });
	}
	onChooseItem(val: string) {
		this.resolve(val);
	}
}