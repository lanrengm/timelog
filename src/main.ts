import { observable, runInAction } from "mobx";
import { Plugin, Notice, Menu, MenuItem, PluginSettingTab, Setting, EventRef, TFolder, TFile, moment } from "obsidian";

import {
  Settings,
  Timelog,
  DEFAULT_SETTINGS,
  PLUGIN_VIEW_TYPE,
  PLUGIN_FILE_EXT,
  PLUGIN_ICON,
  PLUGIN_NAME,
  PLUGIN_FILE_EXT_ERR,
  PLUGIN_VIEW_TYPE_ERR,
  DEFAULT_FILE_DATA,
} from "./settings";
import { TimelogView } from "./views/view";

export default class TimelogPlugin extends Plugin {
  settings: Settings;

  /**
   * 侧栏图标，全局仅创建一个
   *   如果需要赋予它更多的功能，可以让它打开一个模态窗口
   */
  ribbonIcon: HTMLElement | null = null;

  /**
   * 创建新的时间日志文件
   */
  menuItemNew: EventRef | null = null;

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async onload(): Promise<void> {
    DEV ?? console.log(`TimeLogPlugin onload()`);

    await this.loadSettings();
    this.addSettingTab(new TimelogSettingTab(this.app, this));
    if (this.settings.enableRibbonIcon) this.enableRibbonIcon(true);
    if (this.settings.enableFileExplorerMenuItem) this.enableMenuItemNew(true);

    try {
      this.registerView(PLUGIN_VIEW_TYPE, leaf => new TimelogView(leaf, this));
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

  /**
   *  创建新的时光日志文件
   */
  createTimelogFile(path: string): void {
    const fileContent = JSON.stringify(DEFAULT_FILE_DATA);
    this.app.vault.create(path, fileContent).catch(err => new Notice(`${path} 已经存在`));
  }

  /**
   * 开关侧栏图标按钮
   */
  enableRibbonIcon(enable: boolean): void {
    if (enable) {
      this.ribbonIcon = this.addRibbonIcon(PLUGIN_ICON, `新建${PLUGIN_NAME}到根目录`, evt => this.createTimelogFile(`${PLUGIN_NAME}.timelog`));
    } else {
      this.ribbonIcon?.remove();
    }
  }

  /**
   * 开关文件管理器菜单项，该菜单项的作用是新建 timelog 文件
   */
  enableMenuItemNew(enable: boolean): void {
    if (enable) {
      this.menuItemNew = this.app.workspace.on("file-menu", (menu: Menu, file) => {
        menu.addItem((item: MenuItem) => {
          item.setTitle(`新建${PLUGIN_NAME}`);
          item.setIcon("alarm-check");
          item.onClick(evt => {
            const fileName = `${PLUGIN_NAME}.timelog`;
            const fileDir = file instanceof TFolder ? file.path : file.parent?.path ?? "";
            const filePath = (fileDir === "/" ? "" : fileDir) + "/" + fileName;
            this.createTimelogFile(filePath);
          });
        });
      });
      this.registerEvent(this.menuItemNew);
    } else {
      if (this.menuItemNew) this.app.workspace.offref(this.menuItemNew);
    }
  }
}

class TimelogSettingTab extends PluginSettingTab {
  plugin: TimelogPlugin;

  display(): void {
    new Setting(this.containerEl)
      .setName("工具栏按钮")
      .setDesc(`在工具栏添加一个按钮，按钮的功能是在仓库根目录新建一个${PLUGIN_NAME}文件`)
      .addToggle(toggle => {
        toggle.setValue(this.plugin.settings.enableRibbonIcon);
        toggle.onChange(async value => {
          this.plugin.settings.enableRibbonIcon = value;
          await this.plugin.saveSettings();
          this.plugin.enableRibbonIcon(value);
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
          this.plugin.enableMenuItemNew(value);
        });
      });
  }
}
