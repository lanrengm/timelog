import { observable, runInAction } from "mobx";
import { Plugin, Notice, Menu, MenuItem, PluginSettingTab, Setting, EventRef, TFolder, TFile, moment } from "obsidian";

import {
  Settings,
  FileData,
  DEFAULT_SETTINGS,
  PLUGIN_VIEW_TYPE,
  PLUGIN_FILE_EXT,
  PLUGIN_ICON,
  PLUGIN_NAME,
  PLUGIN_FILE_EXT_ERR,
  PLUGIN_VIEW_TYPE_ERR,
  DEFAULT_FILE_DATA,
} from "./settings";
import { TimeLogView } from "./views/view";

export default class TimeLogPlugin extends Plugin {
  settings: Settings;
  // 创建新的时间日志文件
  newFileRibbonIcon: HTMLElement | null = null;
  newFileMenuItemRef: EventRef | null = null;

  async onload(): Promise<void> {
    DEV ?? console.log(`TimeLogPlugin onload()`);
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    if (this.settings.enableRibbonIcon) this.addNewFileRibbonIcon();
    if (this.settings.enableFileExplorerMenuItem) this.addNewFileMenuItem();
    try {
      this.registerView(PLUGIN_VIEW_TYPE, leaf => new TimeLogView(leaf, this));
    } catch (error) {
      new Notice(PLUGIN_VIEW_TYPE_ERR);
      console.error(PLUGIN_VIEW_TYPE_ERR);
    }
    try {
      this.registerExtensions([PLUGIN_FILE_EXT], PLUGIN_VIEW_TYPE);
    } catch (error) {
      new Notice(PLUGIN_FILE_EXT_ERR, 20000);
      console.error(PLUGIN_FILE_EXT_ERR);
    }
  }

  onunload(): void {
    DEV ?? console.log(`TimeLogPlugin onunload()`);
    this.removeNewFileRibbonIcon();
    this.removeNewFileMenuItem();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  newFile(path: string): void {
    this.app.vault.create(path, JSON.stringify(DEFAULT_FILE_DATA)).catch(err => new Notice(`${path} 已经存在`));
  }

  addNewFileRibbonIcon(): void {
    this.newFileRibbonIcon = this.addRibbonIcon(PLUGIN_ICON, `新建${PLUGIN_NAME}到根目录`, evt => this.newFile(`${PLUGIN_NAME}.timelog`));
  }

  removeNewFileRibbonIcon(): void {
    this.newFileRibbonIcon?.remove();
  }

  addNewFileMenuItem(): void {
    this.newFileMenuItemRef = this.app.workspace.on("file-menu", (menu: Menu, file) => {
      menu.addItem((item: MenuItem) => {
        item.setTitle(`新建${PLUGIN_NAME}`);
        item.setIcon("alarm-check");
        item.onClick(evt => {
          const fileName = `${PLUGIN_NAME}.timelog`;
          const fileDir = file instanceof TFolder ? file.path : file.parent?.path ?? "";
          const filePath = (fileDir === "/" ? "" : fileDir) + "/" + fileName;
          this.newFile(filePath);
        });
      });
    });
    this.registerEvent(this.newFileMenuItemRef);
  }

  removeNewFileMenuItem(): void {
    if (this.newFileMenuItemRef) this.app.workspace.offref(this.newFileMenuItemRef);
  }
}

class SettingTab extends PluginSettingTab {
  plugin: TimeLogPlugin;

  display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName("工具栏按钮")
      .setDesc(`在工具栏添加一个按钮，按钮的功能是在仓库根目录新建一个${PLUGIN_NAME}文件`)
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.enableRibbonIcon);
        toggle.onChange(async value => {
          this.plugin.settings.enableRibbonIcon = value;
          await this.plugin.saveSettings();
          if (value) {
            this.plugin.addNewFileRibbonIcon();
          } else {
            this.plugin.removeNewFileRibbonIcon();
          }
        });
      });
    new Setting(this.containerEl)
      .setName("文件管理器右键菜单项")
      .setDesc(`在文件管理器右键菜单添加一项，菜单项的功能是在指定目录新建一个时间${PLUGIN_NAME}文件`)
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.enableFileExplorerMenuItem);
        toggle.onChange(async value => {
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
