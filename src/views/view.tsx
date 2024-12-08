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
import { observable, action, autorun, flow, runInAction, computed } from "mobx";
import * as d3 from "d3";

import { PLUGIN_VIEW_TYPE, PLUGIN_FILE_EXT, PLUGIN_ICON, PLUGIN_NAME, Plan, Timelog, DEFAULT_FILE_DATA, Record, TIME_FMT, TIME_FMT_ID } from "../settings";
import { timeSub } from "../utils";
import TimelogPlugin from "../main";

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
          const modal = new PlanModal(this.app, this);
          modal.open();
          modal.createPlan();
        });
    });
    menu.addItem(item => {
      item
        .setIcon("minus")
        .setTitle("修改计划")
        .onClick(evt => {
          const modal = new PlanModal(this.app, this);
          modal.open();
          modal.changePlan();
        });
    });
    menu.addItem(item => {
      item
        .setIcon("clipboard-list")
        .setTitle("计划管理")
        .onClick(evt => {
          new Notice("计划管理");
        });
    });
  }

  plugin: TimelogPlugin;
  ctlEl: HTMLElement;
  ctxEl: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: TimelogPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.contentEl.setCssStyles({ padding: "var(--file-margins)" });
    const ctlEl = this.contentEl.createDiv({ cls: "timelog-ctl" });
    // 不同的主题渲染表格采用的选择器不同
    // 为了兼容多种主题，添加了 markdown-rendered markdown-preview-view
    const ctxEl = this.contentEl.createDiv({ cls: "timelog-ctx markdown-rendered markdown-preview-view" });
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

    // 测试块
    Clock(this.ctlEl, (render) => {
      autorun(() => {
        const dateStr = this.timer.value.replace(/\s[0-9:]*$/, "");
        const timeStr = this.timer.value.replace(/^[0-9\-]*\s/, "");
        render(dateStr, timeStr);
      });
    });
    this.doing();
    RecordsTable(this.ctxEl, (render) => {
      autorun(()=>{
        const lastRecord = this.timelog.records.slice(-5).reverse();
        render(this.timelog.plans, lastRecord);
      });
    });
    PlansTable(this.ctxEl, (render)=>{
      autorun(()=>{
        render(this.timelog.plans);
      });
    });
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

  doing() {
    const heading = new Setting(this.ctlEl);

    autorun(() => {
      if (this.isDoing.get()) {
        const time = timeSub(this.timelog.records.last()!.start, this.timer.value, TIME_FMT);
        heading.setName(time);
      } else {
        heading.setName(`${this.timer.value}`);
      }
    });

    heading.addDropdown(dd => {
      // this.timelog 更新后刷新视图
      autorun(() => {
        dd.selectEl.empty();
        this.timelog.plans.forEach(plan => dd.addOption(plan.id, plan.name));
        if (this.timelog.records.length !== 0) {
          const lastRecordId = this.timelog.records.last()!.id;
          dd.setValue(lastRecordId);
        }
        // 刷新状态
        runInAction(() => {
          this.selectedPlanId.value = dd.getValue();
        });
      });
      dd.onChange(value => {
        runInAction(() => {
          this.selectedPlanId.value = value;
        });
      });
    });

    heading.addExtraButton(btn => {
      autorun(() => {
        if (this.isDoing.get()) {
          btn.setIcon("square").onClick(() => this.stopPlan());
        } else {
          btn.setIcon("play").onClick(() => this.startPlan());
        }
      });
    });
  }

  /**
   * 监听数据，刷新记录视图（可视化图形）
   */
  showRecordsChart(): void {
    const mounted = this.ctxEl.createDiv();
    autorun(() => {
      mounted.empty();
      const width = this.ctlWidth.value;
      const height = 200;
      const margin = { top: 30, right: 30, bottom: 30, left: 30 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const svg = d3.select(mounted).append("svg").attr("width", width).attr("height", height);
      const inner = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

      const xScale = d3
        .scaleTime()
        .domain([moment().startOf("day"), moment().endOf("day")])
        .range([0, innerW]);
      // xScale.ticks(d3.utcMinute.every(15)!);
      const xAxis = d3
        .axisBottom(xScale)
        .tickValues(xScale.ticks(d3.timeHour.every(1)!))
        .tickFormat(d3.timeFormat("%H"));
      inner.append("g").attr("transform", `translate(0, ${innerH})`).call(xAxis);

      const yScale = d3.scaleLinear().domain([0, 10]).range([0, innerH]);
      inner.append("g").call(d3.axisLeft(yScale));
    });

    // mounted.innerHTML = 'hi';
  }

  /**
   * 计时器，用来刷新时间
   */
  timer = observable({ value: "0000-00-00 00:00:00" });

  /**
   * 心跳，一个时钟，用来刷新时间
   */
  // heart

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
      const start = moment().format(TIME_FMT);
      const newRecord: Record = { start: start, stop: "", id: this.selectedPlanId.value };
      runInAction(() => {
        this.timelog.records.push(newRecord);
      });
      await this.saveTimelog();
    }
  }

  async stopPlan(): Promise<void> {
    if (this.isDoing.get()) {
      const stop = moment().format(TIME_FMT);
      if (stop !== this.timelog.records.last()!.start) {
        runInAction(() => {
          this.timelog.records.last()!.stop = stop;
        });
        await this.saveTimelog();
      }
    }
  }
}

class PlanModal extends Modal {
  view: TimelogView;

  constructor(app: App, view: TimelogView) {
    super(app);
    this.view = view;
  }

  onOpen(): void {
    // 底部【保存】【取消】按钮
    const btnContainer = this.modalEl.createDiv({ cls: `modal-button-container` });
    btnContainer.createEl("button", { cls: "mod-cta", text: "保存" }).onClickEvent(evt => {
      this.save(evt);
      this.close();
    });
    btnContainer.createEl("button", { cls: "mod-cancel", text: "取消" }).onClickEvent(evt => {
      this.cancel(evt);
      this.close();
    });
  }

  save: (evt: MouseEvent) => void = () => {
    DEV ?? console.log(`模态窗口默认 on save 回调`);
  };

  onSave(cb: (evt: MouseEvent) => void) {
    this.save = cb;
  }

  cancel: (evt: MouseEvent) => void = () => {
    DEV ?? console.log(`模态窗口默认 on cancel 回调`);
  };

  onCancel(cb: (evt: MouseEvent) => void) {
    this.cancel = cb;
  }

  createPlan() {
    this.setTitle("新建计划");

    const plan: Plan = { id: moment().format(TIME_FMT_ID), name: "" };

    new Setting(this.contentEl).setName("计划名称").addText(txt => {
      txt
        .setPlaceholder("计划名称")
        .setValue(plan.name)
        .onChange(val => {
          DEV ?? console.log(`${val}`);
          plan.name = val;
        });
    });
    // 提示区
    const tips = new Setting(this.contentEl);

    this.onSave(async () => {
      DEV ?? console.log(`模态窗口 新计划 on save 回调`);
      if (plan.id === "") {
        tips.setDesc(`请输入计划编号`);
      } else if (plan.name === "") {
        tips.setDesc(`请输入计划名称`);
      } else {
        const res = this.view.timelog.plans.filter(v => v.id === plan.id);
        DEV ?? console.log(res);
        if (res.length !== 0) {
          tips.setDesc(`编号为【${res[0].id}】的计划【${res[0].name}】已经存在，请更改编号。`);
        } else {
          runInAction(() => {
            this.view.timelog.plans.push(plan);
          });
          await this.view.saveTimelog();
          this.close();
        }
      }
    });
  }

  changePlan() {
    this.setTitle("修改计划");

    this.view.timelog.plans.forEach((plan, index) => {
      new Setting(this.contentEl).setName(plan.id).addText(txt => {
        txt.setValue(plan.name).onChange(val => {
          runInAction(() => {
            this.view.timelog.plans[index].name = val;
          });
        });
      });
    });

    this.onSave(evt => {
      DEV ?? console.log(`模态窗口 删除计划 on save 回调`);
      // 保存，将修改的内容写入文件
      this.view.saveTimelog();
    });

    this.onCancel(evt => {
      // 不保存，重新加载文件
      this.view.loadTimelog();
    });
  }
}

/**
 * 刷新计划视图（表格视图）
 */
function PlansTable(mountedEl: HTMLElement, callRender: (render: (plans: Plan[])=>void)=>void): HTMLElement {
  const rootEl = mountedEl.createDiv({});
  rootEl.innerHTML = /*html*/ `
    <h2>计划</h2>
    <table>
      <thead><tr><th>名称</th></tr></thead>
      <tbody></tbody>
    </table>
  `;
  /**
   * 渲染视图
   */
  const bodyEl = rootEl.querySelector('table tbody');
  callRender((plans) => {
    bodyEl?.empty();
    let body = '';
    for (const plan of plans) {
      body += /*html*/ `<tr><td>${plan.name}</td></tr>`;
    }
    if(bodyEl) bodyEl.innerHTML = body;
  });
  return rootEl;
}

/**
 * 刷新记录视图（表格形式）
 */
function RecordsTable(mountedEl: HTMLElement, callRender: (render: (plans: Plan[], records: Record[]) => void) => void): HTMLElement {
  /**
   * HTML
   */
  const rootEl = mountedEl.createDiv({});
  rootEl.innerHTML = /*html*/ `
    <h2>记录</h2>
    <table>
      <thead>
        <tr>
          <th>计划</th>
          <th>时长</th>
          <th>开始时间</th>
          <th>结束时间</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  `;
  /**
   * 视图刷新
   */
  const tbodyEl: HTMLTableSectionElement = rootEl.querySelector("table tbody")!;
  callRender((plans, records) => {
    tbodyEl.empty();
    let body = '';
    for (const record of records) {
      body += /*html*/ `
        <tr>
          <td>${plans.find(plan => record.id === plan.id)!.name ?? ""}</td>
          <td>${timeSub(record.start, record.stop, TIME_FMT)}</td>
          <td>${record.start}</td>
          <td>${record.stop}</td>
        </tr>
      `;
    }
    tbodyEl.innerHTML = body;
  });
  return rootEl;
}

/**
 * 时钟组件
 * @param mountedEl 挂载点
 * @param callRender 刷新视图的回调函数
 * @returns 组件根，mounted/cptRoot
 */
function Clock(mountedEl: HTMLElement, callRender: (render: (dateStr: string, timeStr: string) => void)=>void ): HTMLElement {
  /**
   * HTML
   */
  const rootEl = mountedEl.createDiv({ cls: "tl-container" });
  rootEl.innerHTML = /*html*/ `
    <div class="tl-wrapper">
      <div class="text">YYYY-MM-DD</div>
      <div class="text">HH:mm:ss</div>
    </div>
  `;
  /**
   * CSS
   */
  rootEl?.setCssStyles({});
  const wrapperEl: HTMLDivElement | null = rootEl.querySelector(".tl-wrapper");
  wrapperEl?.setCssStyles({
    display: "flex",
    alignSelf: "center",
    justifyContent: "space-around",
    flexWrap: "wrap",
    padding: "1em",
    gap: "1em",
    border: "var(--hr-color) solid 3px",
    borderRadius: "2em",
  });
  const textEls: NodeListOf<HTMLDivElement> = rootEl.querySelectorAll(".text");
  textEls.forEach(textEl =>
    textEl.setCssStyles({
      color: "var(--h2-color)",
      fontSize: "var(--h2-size)",
      fontWeight: "bold",
      lineHeight: "var(--h2-line-height)",
    })
  );
  /**
   * 视图刷新
   */
  const dateEl = textEls[0];
  const timeEl = textEls[1];
  callRender((dateStr, timeStr)=>{
    dateEl.innerText = dateStr;
    timeEl.innerText = timeStr;
  });

  if (rootEl) {
    return rootEl;
  } else {
    throw Error("组件模板错误");
  }
}
