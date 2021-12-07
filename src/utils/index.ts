import fs from "fs";
import path from "path";
import chalk from "chalk";

const _exec = require("child_process").exec;
const log = console.log;

/**
 * 获取git版本
 */
export function getGitVersion() {
  const gitHEAD = fs.readFileSync(".git/HEAD", "utf-8").trim(); // ref: refs/heads/develop
  const ref = gitHEAD.split(": ")[1]; // refs/heads/develop
  const develop = gitHEAD.split("/")[2]; // 环境：develop
  const gitVersion = fs.readFileSync(`.git/${ref}`, "utf-8").trim(); // git版本号，例如：6ceb0ab5059d01fd444cf4e78467cc2dd1184a66
  return `"${develop}: ${gitVersion}"`; // 例如dev环境: "develop: 6ceb0ab5059d01fd444cf4e78467cc2dd1184a66"
}
// 获取package文件路径
export const getFilePath = (name) => {
  return path.resolve(process.cwd(), name);
};
// 获取当前的package文件配置
export const getPackage = () => {
  return require(getFilePath('package.json'));
};
export const checkFileExists = (files) => {
  files.forEach((name) => {
    const filePath = path.resolve(process.cwd(), name);
    if (!fs.existsSync(name)) {
      log(chalk`{red  🚨 ${filePath}文件不存在}`);
      process.exit(1);
    }
  });
};
/**
 * 格式化时间
 *
 * @param  {time} 时间
 * @param  {cFormat} 格式
 * @return {String} 字符串
 *
 * @example formatTime('2018-1-29', '{y}/{m}/{d} {h}:{i}:{s}') // -> 2018/01/29 00:00:00
 */
export function formatTime(time, cFormat) {
  if (arguments.length === 0) return null;
  if (`${time}`.length === 10) {
    time = +time * 1000;
  }

  const format = cFormat || "{y}-{m}-{d} {h}:{i}:{s}";
  let date;
  if (typeof time === "object") {
    date = time;
  } else {
    date = new Date(time);
  }

  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay(),
  };
  const time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key) => {
    let value = formatObj[key];
    if (key === "a")
      return ["一", "二", "三", "四", "五", "六", "日"][value - 1];
    if (result.length > 0 && value < 10) {
      value = `0${value}`;
    }
    return value || 0;
  });
  return time_str;
}
