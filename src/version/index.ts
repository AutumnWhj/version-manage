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
const handleVersionTag = async () => {
  log(chalk`{green 🏷  Tag基线: 根据package.json文件的version生成并更新}`);
  await addTagByPackage();
};

async function addTagByPackage() {
  try {
    await commitAllFiles();

    console.log("packageJson: ", packageJson);
    // 更新 package.json version
    const branch = "getLocalBranch()";
    const config = await generateNewTag(branch, packageJson.version);
    const { version, tag } = config || {};
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
  // await git.push()
  log(chalk`{green 🏷  push标签 ${tag}}成功`);
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
          type: "list",
          default: 1,
          choices: [
            {
              name: "是",
              value: "yes",
            },
            { name: "否", value: "no" },
          ],
        },
      ])
      .then(async ({ commit, env }) => {
        try {
          if (commit === "yes") {
            log(chalk`{gray 🚀  正在自动提交文件}`);
            await git.add("./*");
            await git.commit("🚀");
          } else {
            process.exit(1);
          }
        } catch (err) {}
      });
  }
}

const getReleaseEnv = (env) => {
  if (env.includes("release")) {
    const lastCharIndex = env.lastIndexOf("/");
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
const generateNewTag = async (env = "master", version = "0.0.0") => {
  const date = formatTime(new Date(), "{yy}-{mm}-{dd}");
  const minor = semver.minor(version);
  const patch = semver.patch(version);

  const config = { env, version, tag: `${env}-v${version}-${date}` };
  if (patch >= 99) {
    config.version = semver.inc(version, "minor");
  } else if (minor >= 99) {
    config.version = semver.inc(version, "major");
  } else {
    config.version = semver.inc(version, "patch");
  }
  const currentEnv = getReleaseEnv(env);
  config.tag = `${currentEnv}-v${config.version}-${date}`;
  return config;
};

export default async () => {
  console.log("handleVersionTag");
  await Promise.all([
    checkPackage("inquirer"),
    checkPackage("chalk"),
    checkPackage("simple-git"),
    checkPackage("semver"),
  ]).then(() => handleVersionTag());
};
