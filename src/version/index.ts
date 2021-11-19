import fs from "fs";
import chalk from "chalk";

const inquirer = require("inquirer");
const semver = require("semver");

import gitP, { SimpleGit } from "simple-git/promise";
const git: SimpleGit = gitP(process.cwd());

import {
  checkPackage,
  formatTime,
  getPackageJsonPath,
  getPackage,
} from "../utils";
const log = console.log;
const packageJsonPath = getPackageJsonPath();
const packageJson: any = getPackage();

const inquirerInputTag = async () => {
  const branch = await getLocalBranch();
  const { version: packageVersion } = packageJson || {};
  const { inputTag } = await inquirer.prompt([
    {
      name: "inputTag",
      message: `请输入Tag:`,
      type: "input",
      default: `${branch}-${packageVersion}`,
    },
  ]);
  return inputTag;
};

const getLocalBranch = async () => {
  const { current } = await git.branchLocal();
  return current;
};

async function addTagByPackage(config) {
  try {
    await commitAllFiles();
    // 更新 package.json version
    const branch = await getLocalBranch();
    const { version: packageVersion } = packageJson || {};
    const tagConfig = await generateNewTag({
      env: branch,
      version: packageVersion,
      config,
    });
    const { version, tag } = tagConfig || {};
    packageJson["version"] = version;
    // 更新package对应环境的version
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "  "));
    const date = formatTime(new Date(), "{yy}-{mm}-{dd}");
    log(chalk`{gray ➕  暂存package.json文件变更}`);
    await git.add("./package.json");
    log(chalk`{gray ✔️  提交package.json文件变更}`);
    await git.commit(`chore: release version ${version} in ${date} by ${tag}`);
    log(chalk`{green 👌  package.json文件操作完成}`);

    await createTag(tag);
  } catch (error) {
    const e: any = error;
    log(chalk`{red ${e.message}}`);
  }
}
/**
 * 创建Tag
 * @param {*} versions
 */
async function createTag(tag) {
  log(chalk`{green 🔀  更新本地仓库}`);
  await git.pull({ "--rebase": "true" });

  log(chalk`{green 🏷  创建标签 ${tag}}`);
  await git.addTag(tag);
  await git.push();
  log(chalk`{green 🏷  push标签 ${tag}成功}`);
}

/**
 * commit 所有未提交的文件
 */
async function commitAllFiles() {
  const statusSummary = await git.status();
  const { files } = statusSummary || {};
  const { length } = files || {};
  if (length) {
    await inquirer
      .prompt([
        {
          name: "commit",
          message: ` 🚨 检测到有未提交文件，是否自动提交？`,
          type: "confirm",
          default: false,
        },
      ])
      .then(async ({ commit }) => {
        try {
          if (commit) {
            log(chalk`{gray 🚀  正在自动提交文件}`);
            await git.add("./*");
            await git.commit("🚀 打Tag自动push未提交的文件");
          } else {
            process.exit(1);
          }
        } catch (err) {}
      });
  }
}

const getReleaseEnv = (env) => {
  if (env.includes("release")) {
    const lastCharIndex = env.lastIndexOf("-dev");
    return env.slice(0, lastCharIndex);
  }
  // sass master做特殊处理，映射到release/sass分支
  if (env === "master") {
    return "release/sass";
  }
  return env;
};
/**
 * 生成新Tag
 * @param {*} env master|pre|dev|all
 * @param {*} version
 */
const generateNewTag = async ({
  env = "master",
  version = "0.0.0",
  config,
}) => {
  const { inputTag } = config || {};

  const date = formatTime(new Date(), "{yy}-{mm}-{dd}");
  const minor = semver.minor(version);
  const patch = semver.patch(version);
  let resultVersion = "";
  // 默认99个patch版本后，开始打minor版本
  if (patch >= 99) {
    resultVersion = semver.inc(version, "minor");
  } else if (minor >= 99) {
    resultVersion = semver.inc(version, "major");
  } else {
    resultVersion = semver.inc(version, "patch");
  }
  const currentEnv = getReleaseEnv(env);
  const resultTag = inputTag
    ? inputTag
    : `${currentEnv}-v${resultVersion}-${date}`;
  return { env, version: resultVersion, tag: resultTag };
};

const handleVersionTag = async (config = {}) => {
  log(chalk`{green 🏷  Tag基线: 根据package.json文件的version生成并更新}`);
  inquirer
    .prompt([
      {
        name: "baseline",
        message: `请选择Tag基线:`,
        type: "list",
        default: 1,
        choices: [
          {
            name: "根据package.json文件的version生成并更新文件",
            value: "package",
          },
          { name: "自定义输入Tag", value: "input" },
        ],
      },
    ])
    .then(async ({ baseline }) => {
      try {
        if (baseline === "package") {
          await addTagByPackage(config);
        } else {
          const inputTag = await inquirerInputTag();
          await addTagByPackage({
            ...config,
            inputTag,
          });
        }
        git.push();
      } catch (err) {}
    });
  // await addTagByPackage(config);
};
export default async (config = {}) => {
  await Promise.all([
    checkPackage("inquirer"),
    checkPackage("chalk"),
    checkPackage("simple-git"),
    checkPackage("semver"),
  ]).then(() => handleVersionTag(config));
};
