import { Modal } from "obsidian";

export class MyModal extends Modal {

	onOpen() {
		const {titleEl,contentEl} = this;
		titleEl.setText('Title');
		contentEl.setText('Woah!');
		const c1 = contentEl.createDiv();
		c1.setText('xxx');
		
	}

	onClose() {
		const {titleEl,contentEl} = this;
		titleEl.empty();
		contentEl.empty();
	}
}
