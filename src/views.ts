import { ItemView, WorkspaceLeaf } from "obsidian";


export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {

	// constructor(leaf: WorkspaceLeaf) {
	// 	super(leaf);
	// }

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}
	
	getDisplayText(): string {
		return "L R View";
	}
	
	async onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h1", { text: 'hello L R' });
	}
	
	async onClose() {}
}
