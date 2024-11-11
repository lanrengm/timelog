import { Plugin, FileView, TFile, Notice, Menu, MenuItem, PluginSettingTab, Setting, EventRef, IconName, ButtonComponent, TFolder } from "obsidian";
import { join } from "path";

import { Settings, SETTINGS } from "./settings";
import Btn from "./btn.html";

const VIEW_TYPE = "time-log-view";
const FILE_EXT = "timelog";
const ICON = "alarm-check";
const PLUGIN_NAME = "时光日志";

export default class TimeLogPlugin extends Plugin {
  settings: Settings;
  newFileRibbonIconEl: HTMLElement | null = null;
  newFileMenuItemRef: EventRef | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));

    if (this.settings.enableRibbonIcon) {
      this.addNewFileRibbonIcon();
    }
    if (this.settings.enableFileExplorerMenuItem) {
      this.addNewFileMenuItem();
    }

    this.registerView(VIEW_TYPE, (leaf) => new TimeLogView(leaf));
    try {
      this.registerExtensions([FILE_EXT], VIEW_TYPE);
    } catch (error) {
      const err = `${PLUGIN_NAME}插件尝试使用 ${FILE_EXT} 作为${PLUGIN_NAME}文件的扩展名，但此扩展名已被其它插件占用，请在${PLUGIN_NAME}插件设置中更改${PLUGIN_NAME}文件的扩展名，然后重新加载${PLUGIN_NAME}插件`;
      console.error(err);
      new Notice(err, 20000);
    }
  }

  addNewFileRibbonIcon(): void {
    this.newFileRibbonIconEl = this.addRibbonIcon(ICON, `新建${PLUGIN_NAME}`, async (evt) => {
      let newFile = `${PLUGIN_NAME}.timelog`;
      try {
        await this.app.vault.create(newFile, "");
      } catch (error) {
        new Notice(`${newFile} 已经存在`);
      }
    });
  }

  removeNewFileRibbonIcon(): void {
    this.newFileRibbonIconEl?.remove();
  }

  addNewFileMenuItem(): void {
    this.newFileMenuItemRef = this.app.workspace.on("file-menu", (menu: Menu, file) => {
      menu.addItem((item: MenuItem) => {
        item.setTitle(`新建${PLUGIN_NAME}`);
        item.setIcon("alarm-check");
        item.onClick(async (evt) => {
          const fileName = `${PLUGIN_NAME}.timelog`;
          const fileDir = file instanceof TFolder ? file.path : file.parent?.path ?? "";
          const filePath = join(fileDir, fileName);
          try {
            await this.app.vault.create(filePath, "");
          } catch (error) {
            new Notice(`${filePath} 已经存在`);
          }
        });
      });
    });
    this.registerEvent(this.newFileMenuItemRef);
  }

  removeNewFileMenuItem(): void {
    if (this.newFileMenuItemRef) this.app.workspace.offref(this.newFileMenuItemRef);
  }

  onunload(): void {
    this.removeNewFileRibbonIcon();
    this.removeNewFileMenuItem();
  }

  async loadSettings() {
    this.settings = Object.assign({}, SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SettingTab extends PluginSettingTab {
  plugin: TimeLogPlugin;

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const set1 = new Setting(containerEl);
    set1.setName("工具栏按钮");
    set1.setDesc(`在工具栏添加一个按钮，按钮的功能是在仓库根目录新建一个${PLUGIN_NAME}文件`);
    set1.addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.enableRibbonIcon);
      toggle.onChange(async (value) => {
        this.plugin.settings.enableRibbonIcon = value;
        await this.plugin.saveSettings();
        if (value) {
          this.plugin.addNewFileRibbonIcon();
        } else {
          this.plugin.removeNewFileRibbonIcon();
        }
      });
    });

    const set2 = new Setting(containerEl);
    set2.setName("文件管理器右键菜单项");
    set2.setDesc(`在文件管理器右键菜单添加一项，菜单项的功能是在指定目录新建一个时间${PLUGIN_NAME}文件`);
    set2.addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.enableFileExplorerMenuItem);
      toggle.onChange(async (value) => {
        this.plugin.settings.enableFileExplorerMenuItem = value;
        await this.plugin.saveSettings();
        if (value) {
          this.plugin.addNewFileMenuItem();
        } else {
          this.plugin.removeNewFileMenuItem();
        }
      });
    });
  }
}

type TimeLogTime = string;
type TimeLog = [flag: "starting" | "end", time: TimeLogTime, title: string];

class TimeLogView extends FileView {
  navigation: boolean = true;
  allowNoFile: boolean = false;
  content: string;
  txt: HTMLElement;

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
  }

  async onLoadFile(file: TFile): Promise<void> {
    const contentEl = this.contentEl;
    const ctlEl = contentEl.createDiv({ cls: "timelog-ctl" });
    const ctxEl = (this.txt = contentEl.createDiv({ cls: "timelog-ctx" }));

    const btnMain = ctlEl.createEl("button", { text: `开始/继续/暂停/结束` });
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
    this.content = await this.app.vault.read(file);
    this.txt.innerText = this.content;
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  canAcceptExtension(extension: string): boolean {
    return extension == FILE_EXT;
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return PLUGIN_NAME;
  }

  getIcon(): IconName {
    return ICON;
  }
}
