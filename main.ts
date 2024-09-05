import { Editor, MarkdownView, Notice, Plugin, setIcon, getIconIds, ItemView, WorkspaceLeaf, View } from 'obsidian';
import { clearInterval } from 'timers';

import { MyPluginSettings, MY_SETTINGS, MySettingTab } from "./src/settings";
import { MyModal } from "./src/modals";
import { ExampleView, VIEW_TYPE_EXAMPLE} from "./src/views";

type StatusBarIconButton = HTMLElement;

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	timerDriver: NodeJS.Timer | null = null;
	timerCount: number = 0;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('messages-square', 'Sample Plugin xxx', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice! ');
		});

		const timerLabel = this.addStatusBarItem();
		const playBtn: StatusBarIconButton = this.addStatusBarItem();
		const resetBtn: StatusBarIconButton = this.addStatusBarItem();
		timerLabel.setText('00:00:00');

		setIcon(playBtn, 'play');
		setIcon(resetBtn, 'rotate-ccw');
		playBtn.addEventListener('click', () => {
			if (this.timerDriver){
				// If the timer is running, to pause it.
				setIcon(playBtn, 'play');
				window.clearInterval(this.timerDriver!);
				this.timerDriver = null;
			} else {
				// If the timer was paused, to run it.
				setIcon(playBtn, 'pause');
				this.timerDriver = setInterval(()=>{
					this.timerCount+=1;
					timerLabel.setText(`${
						String(Math.floor(this.timerCount/3600)).padStart(2,'0')}:${
						String(Math.floor(this.timerCount/60)).padStart(2, '0')}:${
							String(this.timerCount%60).padStart(2, '0')}`);
				}, 1000);
			}
		});
		resetBtn.addEventListener('click', () => {
			if (this.timerDriver) {
				window.clearInterval(this.timerDriver!);
				this.timerDriver = null;
				setIcon(playBtn, 'play');
			}
			this.timerCount = 0;
			timerLabel.setText('00:00:00');
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new MyModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new MyModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MySettingTab(this.app, this));

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf)
		);
		this.addRibbonIcon("shield-plus", "L R View", () => {
			this.activateView();
		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			// console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {}

	async activateView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf('tab');
			// workspace.getLeftLeaf
			await leaf!.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
		}
		workspace.revealLeaf(leaf!);
	}

	async loadSettings() {
		this.settings = Object.assign({}, MY_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
