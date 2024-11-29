export const PLUGIN_VIEW_TYPE = "time-log-view";
export const PLUGIN_NAME = "时光日志";
export const PLUGIN_ICON = "alarm-check";
export const PLUGIN_FILE_EXT = "timelog";
export const PLUGIN_FILE_EXT_ERR = `插件【${PLUGIN_NAME}】报错：扩展名【${PLUGIN_FILE_EXT}】冲突。\n请在插件设置中更改【${PLUGIN_NAME}】文件的扩展名，然后重新加载【${PLUGIN_NAME}】插件`;
export const PLUGIN_VIEW_TYPE_ERR = `插件【${PLUGIN_NAME}】报错: 视图标识符【${PLUGIN_VIEW_TYPE}】冲突`;

/**
 * 时间日期格式化字符串
 */
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export const DEFAULT_SETTINGS: Settings = {
  enableRibbonIcon: true,
  enableFileExplorerMenuItem: true,
};

export interface Settings {
  enableRibbonIcon: boolean;
  enableFileExplorerMenuItem: boolean;
}

export const DEFAULT_FILE_DATA: Timelog = {
  plans: [
    { id: "001", name: "背单词"},
    { id: "002", name: "跑步"},
    { id: "003", name: "休息"}
  ],
  records: []
}

export interface Timelog {
  plans: Plan[];
  records: Record[];
}

export interface Plan {
  id: string,
  name: string,
}

export interface Record {
  start: string;
  stop: string;
  id: string;
}
