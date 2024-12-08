import { moment } from "obsidian";

/**
 * 计算时间差
 * @param start 开始时的时间字符串
 * @param stop 结束时的时间字符串
 * @param fmt 时间字符串的格式
 * @returns {string} 格式化后的时间段，返回简化形式
 *   - 完整形式：0000-00-00 00:00:00
 *   - ~~简化形式：00:12:30 12分30秒~~
 *   - 当输入时间不对时，返回空字符串
 */
export function timeSub(start: string, stop: string, fmt: string): string {
  const du = moment.duration(moment(stop, fmt).diff(moment(start, fmt)));
  DEV ?? console.log(`${du.isValid()}`);

  if (du.isValid()) {
    const year = du.get("years").toString().padStart(4, "0");
    const month = du.get("months").toString().padStart(2, "0");
    const day = du.get("days").toString().padStart(2, "0");
    const hour = du.get("hours").toString().padStart(2, "0");
    const minute = du.get("minutes").toString().padStart(2, "0");
    let s = du.get("seconds");
    if (s<0) {
      s = 0;
    }
    const second = s.toString().padStart(2,"0");
  
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    // 简化形式
    // .replace(/^[0-]+/, '');
  } else {
    return '';
  }
}
