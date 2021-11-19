const fs = require("fs");

const inquirer = require("inquirer");
const chalk = require("chalk");
const semver = require("semver");
const git = require("simple-git/promise")(process.cwd());

import {
  checkPackage,
  formatTime,
  getPackageJsonPath,
  getPackage,
} from "../utils";
const log = console.log;
const packageJsonPath = getPackageJsonPath();
const packageJson: any = getPackage();
// 配置不同环境的version属性名
const envConfig = { master: "version", pre: "version_pre", dev: "version_dev" };

const handleVersionTag = () => {
  inquirer
    .prompt([
      {
        name: "baseline",
        message: `选择Tag基线:`,
        type: "list",
        default: 1,
        choices: [
          {
            name: "根据package.json文件的version生成并更新文件",
            value: "package",
          },
          { name: "根据最新的Tag生成", value: "tag" },
        ],
      },
      {
        name: "env",
        message: `选择环境:`,
        type: "list",
        default: 2,
        choices: ["all", "master", "pre", "dev"],
      },
    ])
    .then(async ({ baseline, env }) => {
      try {
        if (baseline === "package") {
          await addTagByPackage(env);
        } else {
          await addTagByTags(env);
        }
        git.push();
      } catch (err) {}
    });
};
/**
 * 根据Tag列表添加Tag
 *
 * @param {*} env
 */
async function addTagByTags(env) {
  // const tags = fs.readdirSync('./.git/refs/tags') // 同步版本的readdir
  await commitAllFiles();
  await git.pull({ "--rebase": "true" });
  const tags = await git.tags();

  let addTagSingle = async (envName) => {
    const reg = new RegExp(`^${envName}`);
    let envTags = tags.all.filter((tag) => reg.test(tag));
    let lastTag = envTags[envTags.length - 1] || `${envName}-v0.0.0-19000101`;
    log(chalk`{gray 🏷  仓库最新的Tag: ${lastTag}}`);
    let lastVsersion = lastTag.split("-")[1].substring(1);
    let version: any = await generateNewTag(envName, lastVsersion);
    log(chalk`{gray 🏷  生成最新的Tag: ${version.tag}}`);
    await createTag([version]);
  };

  if (env === "all") {
    await Promise.all(Object.keys(envConfig).map((key) => addTagSingle(key)));
  } else {
    await addTagSingle(env);
  }
}

async function addTagByPackage(env) {
  try {
    // #region 生成对应环境的最新version和tag
    let versionsPromise;
    if (env === "all") {
      versionsPromise = Object.keys(envConfig).map((key) =>
        generateNewTag(key, packageJson[envConfig[key]] || packageJson.version)
      );
    } else {
      versionsPromise = [
        generateNewTag(env, packageJson[envConfig[env]] || packageJson.version),
      ];
    }
    const versions: any[] = await Promise.all(versionsPromise);
    // #endregion

    // #region 更新本地package.json文件，并将更新后的package信息写入本地文件中
    versions.forEach(({ version, env }) => {
      packageJson[envConfig[env]] = version;
      log(
        chalk`{green 📦  package.json 文件添加属性 => ${envConfig[env]}: ${version}}`
      );
    }); // 更新package对应环境的version
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "  "));
    // #endregion

    // #region commit package.json 文件的修改
    const version = versions[0].version;
    const date = formatTime(new Date(), "{yy}{mm}{dd}");
    const newTagsStr = versions.map((version) => version.tag).join(" / ");
    log(chalk`{gray ➕  暂存package.json文件变更}`);
    await git.add("./package.json");
    log(chalk`{gray ✔️  提交package.json文件变更}`);
    await git.commit(`Relase version ${version} in ${date} by ${newTagsStr}`);
    log(chalk`{green 👌  package.json文件操作完成}`);
    // #endregion

    await commitAllFiles();
    await createTag(versions);
  } catch (error) {
    const e: any = error;
    log(chalk`{red ${e.message}}`);
  }
}
/**
 * 创建Tag
 * @param {*} versions
 */
async function createTag(versions) {
  log(chalk`{green 🔀  更新本地仓库}`);
  await git.pull({ "--rebase": "true" });

  versions.forEach(async (version) => {
    log(chalk`{green 🏷  创建标签 ${version.tag}}`);
    await git.addTag(version.tag);
  });
}
// #endregion

// #region commit 所有未提交的文件
/**
 * commit 所有未提交的文件
 */
async function commitAllFiles() {
  let statusSummary = await git.status();
  if (statusSummary.files.length) {
    log(chalk`{red 🚨  有未提交的文件变更}`);
    log(chalk`{gray ➕  暂存未提交的文件变更}`);
    await git.add("./*");
    log(chalk`{gray ✔️  提交未提交的文件变更}`);
    await git.commit("🚀");
  }
}

/**
 * 生成新Tag
 * @param {*} env master|pre|dev|all
 * @param {*} version
 */
function generateNewTag(env = "pre", version = "0.0.0") {
  return new Promise((resolve, reject) => {
    // const major = semver.major(version)
    const minor = semver.minor(version);
    const patch = semver.patch(version);
    const date = formatTime(new Date(), "{yy}{mm}{dd}");
    const config = { env, version, tag: `${env}-v${version}-${date}` };
    if (patch >= 99) {
      config.version = semver.inc(version, "minor");
    } else if (minor >= 99) {
      config.version = semver.inc(version, "major");
    } else {
      config.version = semver.inc(version, "patch");
    }
    config.tag = `${env}-v${config.version}-${date}`;
    resolve(config);
  });
}

export default async () => {
  console.log("handleVersionTag");
  await Promise.all([
    checkPackage("inquirer"),
    checkPackage("chalk"),
    checkPackage("simple-git"),
    checkPackage("semver"),
  ]).then(() => handleVersionTag());
};
