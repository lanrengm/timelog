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
		return "Example view";
	}
	
	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Hello World!"});
	}
	
	async onClose() {}
}
