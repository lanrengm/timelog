import { observable, action, autorun, flow, runInAction } from "mobx";
import {
  App,
  FileView,
  Notice,
  TFile,
  IconName,
  WorkspaceLeaf,
  Setting,
  ButtonComponent,
  Component,
  Menu,
  Modal,
  MomentFormatComponent,
  moment,
} from "obsidian";

import TimeLogPlugin from "../main";
import { PLUGIN_VIEW_TYPE, PLUGIN_FILE_EXT, PLUGIN_ICON, PLUGIN_NAME, Plan, FileData, DEFAULT_FILE_DATA } from "../settings";

type TimeLogTime = string;
type TimeLog = [flag: "starting" | "end", time: TimeLogTime, title: string];

export class TimeLogView extends FileView {
  plugin: TimeLogPlugin;
  navigation: boolean = true;
  allowNoFile: boolean = false;
  file: TFile;
  fileData: FileData = observable(DEFAULT_FILE_DATA);
  ctlEl: HTMLElement;
  ctxEl: HTMLElement;
  // 计时器，用来刷新时间
  timer = observable({ value: "" });

  constructor(leaf: WorkspaceLeaf, plugin: TimeLogPlugin) {
    super(leaf);
    this.plugin = plugin;
    const ctlEl = this.contentEl.createDiv({ cls: "timelog-ctl" });
    const ctxEl = this.contentEl.createDiv({ cls: "timelog-ctx" });
    this.ctlEl = ctlEl;
    this.ctxEl = ctxEl;
    DEV ?? console.log(`new TimeLogView(${leaf}, ${plugin})`);
  }

  onPaneMenu(menu: Menu, source: "more-options" | "tab-header" | string) {
    super.onPaneMenu(menu, source);
    menu.addItem(item => {
      item
        .setIcon("plus")
        .setTitle("新建计划")
        .onClick(evt => {
          new NewPlanModal(this.app, this).open();
        });
    });
    menu.addItem(item => {
      item
        .setIcon("minus")
        .setTitle("删除计划")
        .onClick(evt => {
          new Notice("删除计划");
        });
    });
  }

  async onOpen(): Promise<void> {
    DEV ?? console.log(`onOpen(${PLUGIN_VIEW_TYPE})`);
    
    this.registerInterval(
      window.setInterval(() => {
        DEV ?? console.log(`计时器`, this);
        runInAction(() => {
          this.timer.value = moment().format("YYYY-MM-DD HH:mm:ss");
        });
      }, 1000)
    );

    // 监听 ctlEl 的宽度，动态调整内边距
    new ResizeObserver(entries => {
      DEV ?? console.log(`${this.ctlEl.clientWidth}`);
      // DEV ?? new Notice(`${this.ctlEl.clientWidth}`);
      if (entries[0].contentRect.width > 500) {
        const css = {
          paddingLeft: `50px`,
          paddingRight: `50px`,
        };
        this.ctlEl.setCssStyles(css);
        this.ctxEl.setCssStyles(css);
      } else {
        const css = {
          paddingLeft: `0px`,
          paddingRight: `0px`,
        };
        this.ctlEl.setCssStyles(css);
        this.ctxEl.setCssStyles(css);
      }
    }).observe(this.ctlEl);

    const selectPlan = new Setting(this.ctlEl).setName("选择计划");
    selectPlan.addDropdown(dd => {
      autorun(() => {
        dd.selectEl.empty();
        this.fileData.plans.forEach(plan => dd.addOption(plan.id, plan.name));
        const value = dd.getValue();
        selectPlan.setDesc(`编号: ${value}, 名称: ${this.fileData.plans.find(plan => plan.id === value)?.name}`);
      });
      dd.onChange(value => {
        selectPlan.setDesc(`编号: ${value}, 名称: ${this.fileData.plans.find(plan => plan.id === value)?.name}`);
      });
    });
    const startEl = new Setting(this.ctlEl);
    autorun(()=>{
      startEl.setName(`${this.timer.value}`);
    });
    startEl.addButton(btn => {
      btn.setButtonText(`现在开始`).onClick(evt => {});
    });

    // 监听数据，刷新表格
    const table = this.ctxEl.createEl("table");
    table.createCaption().setText("计划");
    const headTr = table.createTHead().createEl("tr");
    headTr.createEl("th").setText("编号");
    headTr.createEl("th").setText("名称");
    const body = table.createTBody();
    autorun(() => {
      body.empty();
      this.fileData.plans.forEach(plan => {
        const bodyTr = body.createEl("tr");
        bodyTr.createEl("td").setText(plan.id);
        bodyTr.createEl("td").setText(plan.name);
      });
    });
  }

  async onLoadFile(file: TFile): Promise<void> {
    DEV ?? console.log(`onloadFile(${file.name})`);
    this.file = file;
    await this.loadFileData();
  }

  async onUnloadFile(file: TFile): Promise<void> {
    DEV ?? console.log(`onUnloadFile(${file.name})`);
    // 切换时光日志时触发
  }

  async onClose(): Promise<void> {
    DEV ?? console.log(`onClose(${PLUGIN_VIEW_TYPE})`);
    // 关闭标签页时触发
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

  async loadFileData() {
    const content = await this.app.vault.read(this.file);
    const fileData: FileData = Object.assign({}, DEFAULT_FILE_DATA, JSON.parse(content));
    runInAction(() => {
      Object.assign(this.fileData, fileData);
    });
  }

  async saveFileData(): Promise<void> {
    const content = JSON.stringify(this.fileData);
    await this.app.vault.modify(this.file, content);
  }
}

class NewPlanModal extends Modal {
  view: TimeLogView;

  constructor(app: App, view: TimeLogView) {
    super(app);
    this.view = view;
  }

  onOpen(): void {
    const plan: Plan = { id: "", name: "" };
    this.titleEl.setText("新建计划");
    new Setting(this.contentEl)
      .setName("编号")
      .setDesc("编号不能变，计划名随便改")
      .addText(txt => {
        txt
          .setPlaceholder("001")
          .setValue(plan.id)
          .onChange(val => {
            DEV ?? console.log(`${val}`);
            plan.id = val;
          });
      });
    new Setting(this.contentEl).setName("计划名称").addText(txt => {
      txt
        .setPlaceholder("背单词")
        .setValue(plan.name)
        .onChange(val => {
          DEV ?? console.log(`${val}`);
          plan.name = val;
        });
    });
    const confirm = new Setting(this.contentEl)
      .addButton(btn => {
        btn.setButtonText("取消").onClick(evt => this.close());
      })
      .addButton(btn => {
        btn.setButtonText("确认").onClick(async evt => {
          if (plan.id === "") {
            confirm.setDesc(`请输入计划编号`);
          } else if (plan.name === "") {
            confirm.setDesc(`请输入计划名称`);
          } else {
            const res = this.view.fileData.plans.filter(v => v.id === plan.id);
            DEV ?? console.log(res);
            if (res.length > 0) {
              confirm.setDesc(`编号为【${res[0].id}】的计划【${res[0].name}】已经存在，请更改编号。`);
            } else {
              this.view.fileData.plans.push(plan);
              await this.view.saveFileData();
              this.close();
            }
          }
        });
      });
  }
}
