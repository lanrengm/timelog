import { FileView, Notice, TFile, IconName, WorkspaceLeaf } from "obsidian";

import TimeLogPlugin from "../main";
import { PLUGIN_VIEW_TYPE, PLUGIN_FILE_EXT, PLUGIN_ICON, PLUGIN_NAME } from "../settings";


type TimeLogTime = string;
type TimeLog = [flag: "starting" | "end", time: TimeLogTime, title: string];

export class TimeLogView extends FileView {
  plugin: TimeLogPlugin;
  navigation: boolean = true;
  allowNoFile: boolean = false;
  content: string;
  txt: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: TimeLogPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
  }

  async onLoadFile(file: TFile): Promise<void> {
    this.plugin.loadPluginData(file);
    this.contentEl.empty();
    const ctlEl = this.contentEl.createDiv({ cls: "timelog-ctl" });
    const ctxEl = this.contentEl.createDiv({ cls: "timelog-ctx" });
    this.txt = ctxEl;

    const btnMain = ctlEl.createEl("button", { text: `开始/继续/暂停/结束` });
    ctlEl.addEventListener("click", (evt) => {
      this.refresh(file);
    });
    ctlEl.clientWidth;
    const observer = new ResizeObserver((entries) => {
      const length = entries[0].contentRect.width * 0.6;
      btnMain.setCssStyles({
        width: `${length}px`,
        height: `${length}px`,
        borderRadius: `${length}px`,
      });
    });
    observer.observe(ctlEl);
  }

  async refresh(file: TFile) {
    this.txt.innerText = JSON.stringify(this.plugin.data);
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  canAcceptExtension(extension: string): boolean {
    return extension == PLUGIN_FILE_EXT;
  }

  getViewType(): string {
    return PLUGIN_VIEW_TYPE;
  }

  getDisplayText() {
    return PLUGIN_NAME;
  }

  getIcon(): IconName {
    return PLUGIN_ICON;
  }
}
