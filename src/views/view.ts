import * as d3 from "d3";
import { observable, action, autorun, flow, runInAction, computed } from "mobx";
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

import TimelogPlugin from "../main";
import { PLUGIN_VIEW_TYPE, PLUGIN_FILE_EXT, PLUGIN_ICON, PLUGIN_NAME, Plan, Timelog, DEFAULT_FILE_DATA, Record, DATE_TIME_FORMAT } from "../settings";

export class TimelogView extends FileView {
  navigation: boolean = true;
  allowNoFile: boolean = false;
  file: TFile;

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

  plugin: TimelogPlugin;
  ctlEl: HTMLElement;
  ctxEl: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: TimelogPlugin) {
    super(leaf);
    this.plugin = plugin;
    const ctlEl = this.contentEl.createDiv({ cls: "timelog-ctl" });
    const ctxEl = this.contentEl.createDiv({ cls: "timelog-ctx" });
    this.ctlEl = ctlEl;
    this.ctxEl = ctxEl;
    DEV ?? console.log(`new TimeLogView(${leaf}, ${plugin})`);
  }

  async onOpen(): Promise<void> {
    DEV ?? console.log(`onOpen(${PLUGIN_VIEW_TYPE})`);

    this.registerInterval(
      window.setInterval(() => {
        // DEV ?? console.log(`计时器`, this);
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
      runInAction(() => {
        this.ctlWidth.value = entries[0].contentRect.width;
      });
    }).observe(this.ctlEl);

    const selectPlan = new Setting(this.ctlEl).setName("选择计划");
    selectPlan.addDropdown(dd => {
      autorun(() => {
        DEV ?? console.log(`${this.timelog.plans.length}`);
        dd.selectEl.empty();
        this.timelog.plans.forEach(plan => dd.addOption(plan.id, plan.name));
        const value = dd.getValue();
        selectPlan.setDesc(`编号: ${value}, 名称: ${this.timelog.plans.find(plan => plan.id === value)?.name}`);
        // 切换日志文件时更新
        runInAction(() => {
          DEV ?? console.log(`${this.selectedPlanId.value}`);
          this.selectedPlanId.value = value;
        });
      });
      dd.onChange(value => {
        selectPlan.setDesc(`编号: ${value}, 名称: ${this.timelog.plans.find(plan => plan.id === value)?.name}`);
        runInAction(() => {
          this.selectedPlanId.value = value;
          DEV ?? console.log(`${this.selectedPlanId.value}`);
        });
      });
    });
    const startEl = new Setting(this.ctlEl);
    autorun(() => {
      if (this.isDoing.get()) {
        const startTime = moment(this.timelog.records.last()!.start, DATE_TIME_FORMAT);
        const du = moment.duration(moment(this.timer.value, DATE_TIME_FORMAT).diff(startTime));
        const year = du.get("years").toString().padStart(4, "0");
        const month = du.get("months").toString().padStart(2, "0");
        const day = du.get("days").toString().padStart(2, "0");
        const hour = du.get("hours").toString().padStart(2, "0");
        const minute = du.get("minutes").toString().padStart(2, "0");
        const second = du.get("seconds").toString().padStart(2, "0");
        startEl.setName(`${year}-${month}-${day} ${hour}:${minute}:${second}`);
      } else {
        startEl.setName(`${this.timer.value}`);
      }
    });
    startEl.addButton(btn => {
      autorun(() => {
        if (this.isDoing.get()) {
          btn.setButtonText(`现在结束`).onClick(() => this.stopPlan());
        } else {
          btn.setButtonText(`现在开始`).onClick(() => this.startPlan());
        }
      });
    });

    // this.ctxEl.createEl("hr");
    // this.showPlans(/* this.ctxEl, this.timelog.plans */);
    this.ctxEl.createEl("hr");
    this.showRecordsChart();
    // this.showRecordsTable(/* this.ctxEl, this.timelog.records */);
  }

  async onClose(): Promise<void> {
    DEV ?? console.log(`onClose(${PLUGIN_VIEW_TYPE})`);
    // 关闭标签页时触发
  }

  async onLoadFile(file: TFile): Promise<void> {
    DEV ?? console.log(`onloadFile(${file.name})`);
    this.file = file;
    await this.loadTimelog();
  }

  async onUnloadFile(file: TFile): Promise<void> {
    DEV ?? console.log(`onUnloadFile(${file.name})`);
    // 切换时光日志时触发
  }

  /**
   * 监听数据，刷新计划视图（表格视图）
   */
  showPlans(): void {
    const mounted: HTMLElement = this.ctxEl;
    //
    const table = mounted.createEl("table");
    table.createCaption().setText("计划");
    const headTr = table.createTHead().createEl("tr");
    headTr.createEl("th").setText("编号");
    headTr.createEl("th").setText("名称");
    const body = table.createTBody();
    autorun(() => {
      body.empty();
      this.timelog.plans.forEach(plan => {
        const bodyTr = body.createEl("tr");
        bodyTr.createEl("td").setText(plan.id);
        bodyTr.createEl("td").setText(plan.name);
      });
    });
  }

  /**
   * 监听数据，刷新记录视图（表格形式）
   */
  showRecordsTable(): void {
    const mounted: HTMLElement = this.ctxEl;
    //
    const table = mounted.createEl("table");
    table.createCaption().setText("记录");
    const headTr = table.createTHead().createEl("tr");
    headTr.createEl("th").setText("开始时间");
    headTr.createEl("th").setText("结束时间");
    headTr.createEl("th").setText("ID");
    const body = table.createTBody();
    autorun(() => {
      body.empty();
      this.timelog.records.forEach(record => {
        const bodyTr = body.createEl("tr");
        bodyTr.createEl("td").setText(record.start);
        bodyTr.createEl("td").setText(record.stop);
        bodyTr.createEl("td").setText(record.id);
      });
    });
  }

  /**
   * 监听数据，刷新记录视图（可视化图形）
   */
  showRecordsChart(): void {
    const mounted = this.ctxEl.createDiv();
    autorun(()=>{
      mounted.empty();
      const width = this.ctlWidth.value;
      const height = 200;
      const margin = { top: 30, right: 30, bottom: 30, left: 30 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const svg = d3.select(mounted).append("svg").attr("width", width).attr("height", height);
      const inner = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    
      const xScale = d3.scaleTime().domain([moment().startOf('day'), moment().endOf('day')]).range([0, innerW]);
      // xScale.ticks(d3.utcMinute.every(15)!);
      const xAxis = d3.axisBottom(xScale).tickValues(xScale.ticks(d3.timeHour.every(1)!)).tickFormat(d3.timeFormat('%H'));
      inner.append("g").attr("transform", `translate(0, ${innerH})`).call(xAxis);
    
      const yScale = d3.scaleLinear().domain([0, 10]).range([0, innerH]);
      inner.append("g").call(d3.axisLeft(yScale));
      
    });

    // mounted.innerHTML = 'hi';
  }

  /**
   * 计时器，用来刷新时间
   */
  timer = observable({ value: "" });

  /**
   * 时间日志文件数据
   */
  timelog: Timelog = observable(DEFAULT_FILE_DATA);

  /**
   * 判断当前视图是否正在执行计划
   */
  readonly isDoing = computed(() => {
    const records = this.timelog.records;
    if (records.length !== 0) {
      const last = records.last()!;
      if (last.stop === "") {
        return true;
      }
    }
    return false;
  });

  /**
   * 选中的计划
   */
  selectedPlanId = observable({ value: "" });

  /**
   * 内容区宽度
   */
  ctlWidth = observable({ value: 0 });

  async loadTimelog() {
    const content = await this.app.vault.read(this.file);
    const fileData: Timelog = Object.assign({}, DEFAULT_FILE_DATA, JSON.parse(content));
    runInAction(() => {
      Object.assign(this.timelog, fileData);
    });
  }

  async saveTimelog(): Promise<void> {
    const content = JSON.stringify(this.timelog);
    await this.app.vault.modify(this.file, content);
  }

  async startPlan(): Promise<void> {
    DEV ?? console.log(this.isDoing.get());
    if (this.isDoing.get()) {
      throw Error("无法开始计划，请先停止当前计划！");
    } else {
      const start = moment().format(DATE_TIME_FORMAT);
      const newRecord: Record = { start: start, stop: "", id: this.selectedPlanId.value };
      runInAction(() => {
        this.timelog.records.push(newRecord);
      });
      await this.saveTimelog();
    }
  }

  async stopPlan(): Promise<void> {
    if (this.isDoing.get()) {
      const stop = moment().format(DATE_TIME_FORMAT);
      runInAction(() => {
        this.timelog.records.last()!.stop = stop;
      });
      await this.saveTimelog();
    }
  }
}

class NewPlanModal extends Modal {
  view: TimelogView;

  constructor(app: App, view: TimelogView) {
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
            const res = this.view.timelog.plans.filter(v => v.id === plan.id);
            DEV ?? console.log(res);
            if (res.length !== 0) {
              confirm.setDesc(`编号为【${res[0].id}】的计划【${res[0].name}】已经存在，请更改编号。`);
            } else {
              runInAction(() => {
                this.view.timelog.plans.push(plan);
              });
              await this.view.saveTimelog();
              this.close();
            }
          }
        });
      });
  }
}
