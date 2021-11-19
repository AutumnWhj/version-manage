'use strict';

var events = require('events');

function toArr(any) {
	return any == null ? [] : Array.isArray(any) ? any : [any];
}

function toVal(out, key, val, opts) {
	var x, old=out[key], nxt=(
		!!~opts.string.indexOf(key) ? (val == null || val === true ? '' : String(val))
		: typeof val === 'boolean' ? val
		: !!~opts.boolean.indexOf(key) ? (val === 'false' ? false : val === 'true' || (out._.push((x = +val,x * 0 === 0) ? x : val),!!val))
		: (x = +val,x * 0 === 0) ? x : val
	);
	out[key] = old == null ? nxt : (Array.isArray(old) ? old.concat(nxt) : [old, nxt]);
}

function mri2 (args, opts) {
	args = args || [];
	opts = opts || {};

	var k, arr, arg, name, val, out={ _:[] };
	var i=0, j=0, idx=0, len=args.length;

	const alibi = opts.alias !== void 0;
	const strict = opts.unknown !== void 0;
	const defaults = opts.default !== void 0;

	opts.alias = opts.alias || {};
	opts.string = toArr(opts.string);
	opts.boolean = toArr(opts.boolean);

	if (alibi) {
		for (k in opts.alias) {
			arr = opts.alias[k] = toArr(opts.alias[k]);
			for (i=0; i < arr.length; i++) {
				(opts.alias[arr[i]] = arr.concat(k)).splice(i, 1);
			}
		}
	}

	for (i=opts.boolean.length; i-- > 0;) {
		arr = opts.alias[opts.boolean[i]] || [];
		for (j=arr.length; j-- > 0;) opts.boolean.push(arr[j]);
	}

	for (i=opts.string.length; i-- > 0;) {
		arr = opts.alias[opts.string[i]] || [];
		for (j=arr.length; j-- > 0;) opts.string.push(arr[j]);
	}

	if (defaults) {
		for (k in opts.default) {
			name = typeof opts.default[k];
			arr = opts.alias[k] = opts.alias[k] || [];
			if (opts[name] !== void 0) {
				opts[name].push(k);
				for (i=0; i < arr.length; i++) {
					opts[name].push(arr[i]);
				}
			}
		}
	}

	const keys = strict ? Object.keys(opts.alias) : [];

	for (i=0; i < len; i++) {
		arg = args[i];

		if (arg === '--') {
			out._ = out._.concat(args.slice(++i));
			break;
		}

		for (j=0; j < arg.length; j++) {
			if (arg.charCodeAt(j) !== 45) break; // "-"
		}

		if (j === 0) {
			out._.push(arg);
		} else if (arg.substring(j, j + 3) === 'no-') {
			name = arg.substring(j + 3);
			if (strict && !~keys.indexOf(name)) {
				return opts.unknown(arg);
			}
			out[name] = false;
		} else {
			for (idx=j+1; idx < arg.length; idx++) {
				if (arg.charCodeAt(idx) === 61) break; // "="
			}

			name = arg.substring(j, idx);
			val = arg.substring(++idx) || (i+1 === len || (''+args[i+1]).charCodeAt(0) === 45 || args[++i]);
			arr = (j === 2 ? [name] : name);

			for (idx=0; idx < arr.length; idx++) {
				name = arr[idx];
				if (strict && !~keys.indexOf(name)) return opts.unknown('-'.repeat(j) + name);
				toVal(out, name, (idx + 1 < arr.length) || val, opts);
			}
		}
	}

	if (defaults) {
		for (k in opts.default) {
			if (out[k] === void 0) {
				out[k] = opts.default[k];
			}
		}
	}

	if (alibi) {
		for (k in out) {
			arr = opts.alias[k] || [];
			while (arr.length > 0) {
				out[arr.shift()] = out[k];
			}
		}
	}

	return out;
}

const removeBrackets = (v) => v.replace(/[<[].+/, "").trim();
const findAllBrackets = (v) => {
  const ANGLED_BRACKET_RE_GLOBAL = /<([^>]+)>/g;
  const SQUARE_BRACKET_RE_GLOBAL = /\[([^\]]+)\]/g;
  const res = [];
  const parse = (match) => {
    let variadic = false;
    let value = match[1];
    if (value.startsWith("...")) {
      value = value.slice(3);
      variadic = true;
    }
    return {
      required: match[0].startsWith("<"),
      value,
      variadic
    };
  };
  let angledMatch;
  while (angledMatch = ANGLED_BRACKET_RE_GLOBAL.exec(v)) {
    res.push(parse(angledMatch));
  }
  let squareMatch;
  while (squareMatch = SQUARE_BRACKET_RE_GLOBAL.exec(v)) {
    res.push(parse(squareMatch));
  }
  return res;
};
const getMriOptions = (options) => {
  const result = {alias: {}, boolean: []};
  for (const [index, option] of options.entries()) {
    if (option.names.length > 1) {
      result.alias[option.names[0]] = option.names.slice(1);
    }
    if (option.isBoolean) {
      if (option.negated) {
        const hasStringTypeOption = options.some((o, i) => {
          return i !== index && o.names.some((name) => option.names.includes(name)) && typeof o.required === "boolean";
        });
        if (!hasStringTypeOption) {
          result.boolean.push(option.names[0]);
        }
      } else {
        result.boolean.push(option.names[0]);
      }
    }
  }
  return result;
};
const findLongest = (arr) => {
  return arr.sort((a, b) => {
    return a.length > b.length ? -1 : 1;
  })[0];
};
const padRight = (str, length) => {
  return str.length >= length ? str : `${str}${" ".repeat(length - str.length)}`;
};
const camelcase = (input) => {
  return input.replace(/([a-z])-([a-z])/g, (_, p1, p2) => {
    return p1 + p2.toUpperCase();
  });
};
const setDotProp = (obj, keys, val) => {
  let i = 0;
  let length = keys.length;
  let t = obj;
  let x;
  for (; i < length; ++i) {
    x = t[keys[i]];
    t = t[keys[i]] = i === length - 1 ? val : x != null ? x : !!~keys[i + 1].indexOf(".") || !(+keys[i + 1] > -1) ? {} : [];
  }
};
const setByType = (obj, transforms) => {
  for (const key of Object.keys(transforms)) {
    const transform = transforms[key];
    if (transform.shouldTransform) {
      obj[key] = Array.prototype.concat.call([], obj[key]);
      if (typeof transform.transformFunction === "function") {
        obj[key] = obj[key].map(transform.transformFunction);
      }
    }
  }
};
const getFileName = (input) => {
  const m = /([^\\\/]+)$/.exec(input);
  return m ? m[1] : "";
};
const camelcaseOptionName = (name) => {
  return name.split(".").map((v, i) => {
    return i === 0 ? camelcase(v) : v;
  }).join(".");
};
class CACError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

class Option {
  constructor(rawName, description, config) {
    this.rawName = rawName;
    this.description = description;
    this.config = Object.assign({}, config);
    rawName = rawName.replace(/\.\*/g, "");
    this.negated = false;
    this.names = removeBrackets(rawName).split(",").map((v) => {
      let name = v.trim().replace(/^-{1,2}/, "");
      if (name.startsWith("no-")) {
        this.negated = true;
        name = name.replace(/^no-/, "");
      }
      return camelcaseOptionName(name);
    }).sort((a, b) => a.length > b.length ? 1 : -1);
    this.name = this.names[this.names.length - 1];
    if (this.negated && this.config.default == null) {
      this.config.default = true;
    }
    if (rawName.includes("<")) {
      this.required = true;
    } else if (rawName.includes("[")) {
      this.required = false;
    } else {
      this.isBoolean = true;
    }
  }
}

const processArgs = process.argv;
const platformInfo = `${process.platform}-${process.arch} node-${process.version}`;

class Command {
  constructor(rawName, description, config = {}, cli) {
    this.rawName = rawName;
    this.description = description;
    this.config = config;
    this.cli = cli;
    this.options = [];
    this.aliasNames = [];
    this.name = removeBrackets(rawName);
    this.args = findAllBrackets(rawName);
    this.examples = [];
  }
  usage(text) {
    this.usageText = text;
    return this;
  }
  allowUnknownOptions() {
    this.config.allowUnknownOptions = true;
    return this;
  }
  ignoreOptionDefaultValue() {
    this.config.ignoreOptionDefaultValue = true;
    return this;
  }
  version(version, customFlags = "-v, --version") {
    this.versionNumber = version;
    this.option(customFlags, "Display version number");
    return this;
  }
  example(example) {
    this.examples.push(example);
    return this;
  }
  option(rawName, description, config) {
    const option = new Option(rawName, description, config);
    this.options.push(option);
    return this;
  }
  alias(name) {
    this.aliasNames.push(name);
    return this;
  }
  action(callback) {
    this.commandAction = callback;
    return this;
  }
  isMatched(name) {
    return this.name === name || this.aliasNames.includes(name);
  }
  get isDefaultCommand() {
    return this.name === "" || this.aliasNames.includes("!");
  }
  get isGlobalCommand() {
    return this instanceof GlobalCommand;
  }
  hasOption(name) {
    name = name.split(".")[0];
    return this.options.find((option) => {
      return option.names.includes(name);
    });
  }
  outputHelp() {
    const {name, commands} = this.cli;
    const {
      versionNumber,
      options: globalOptions,
      helpCallback
    } = this.cli.globalCommand;
    let sections = [
      {
        body: `${name}${versionNumber ? `/${versionNumber}` : ""}`
      }
    ];
    sections.push({
      title: "Usage",
      body: `  $ ${name} ${this.usageText || this.rawName}`
    });
    const showCommands = (this.isGlobalCommand || this.isDefaultCommand) && commands.length > 0;
    if (showCommands) {
      const longestCommandName = findLongest(commands.map((command) => command.rawName));
      sections.push({
        title: "Commands",
        body: commands.map((command) => {
          return `  ${padRight(command.rawName, longestCommandName.length)}  ${command.description}`;
        }).join("\n")
      });
      sections.push({
        title: `For more info, run any command with the \`--help\` flag`,
        body: commands.map((command) => `  $ ${name}${command.name === "" ? "" : ` ${command.name}`} --help`).join("\n")
      });
    }
    let options = this.isGlobalCommand ? globalOptions : [...this.options, ...globalOptions || []];
    if (!this.isGlobalCommand && !this.isDefaultCommand) {
      options = options.filter((option) => option.name !== "version");
    }
    if (options.length > 0) {
      const longestOptionName = findLongest(options.map((option) => option.rawName));
      sections.push({
        title: "Options",
        body: options.map((option) => {
          return `  ${padRight(option.rawName, longestOptionName.length)}  ${option.description} ${option.config.default === void 0 ? "" : `(default: ${option.config.default})`}`;
        }).join("\n")
      });
    }
    if (this.examples.length > 0) {
      sections.push({
        title: "Examples",
        body: this.examples.map((example) => {
          if (typeof example === "function") {
            return example(name);
          }
          return example;
        }).join("\n")
      });
    }
    if (helpCallback) {
      sections = helpCallback(sections) || sections;
    }
    console.log(sections.map((section) => {
      return section.title ? `${section.title}:
${section.body}` : section.body;
    }).join("\n\n"));
  }
  outputVersion() {
    const {name} = this.cli;
    const {versionNumber} = this.cli.globalCommand;
    if (versionNumber) {
      console.log(`${name}/${versionNumber} ${platformInfo}`);
    }
  }
  checkRequiredArgs() {
    const minimalArgsCount = this.args.filter((arg) => arg.required).length;
    if (this.cli.args.length < minimalArgsCount) {
      throw new CACError(`missing required args for command \`${this.rawName}\``);
    }
  }
  checkUnknownOptions() {
    const {options, globalCommand} = this.cli;
    if (!this.config.allowUnknownOptions) {
      for (const name of Object.keys(options)) {
        if (name !== "--" && !this.hasOption(name) && !globalCommand.hasOption(name)) {
          throw new CACError(`Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\``);
        }
      }
    }
  }
  checkOptionValue() {
    const {options: parsedOptions, globalCommand} = this.cli;
    const options = [...globalCommand.options, ...this.options];
    for (const option of options) {
      const value = parsedOptions[option.name.split(".")[0]];
      if (option.required) {
        const hasNegated = options.some((o) => o.negated && o.names.includes(option.name));
        if (value === true || value === false && !hasNegated) {
          throw new CACError(`option \`${option.rawName}\` value is missing`);
        }
      }
    }
  }
}
class GlobalCommand extends Command {
  constructor(cli) {
    super("@@global@@", "", {}, cli);
  }
}

var __assign = Object.assign;
class CAC extends events.EventEmitter {
  constructor(name = "") {
    super();
    this.name = name;
    this.commands = [];
    this.rawArgs = [];
    this.args = [];
    this.options = {};
    this.globalCommand = new GlobalCommand(this);
    this.globalCommand.usage("<command> [options]");
  }
  usage(text) {
    this.globalCommand.usage(text);
    return this;
  }
  command(rawName, description, config) {
    const command = new Command(rawName, description || "", config, this);
    command.globalCommand = this.globalCommand;
    this.commands.push(command);
    return command;
  }
  option(rawName, description, config) {
    this.globalCommand.option(rawName, description, config);
    return this;
  }
  help(callback) {
    this.globalCommand.option("-h, --help", "Display this message");
    this.globalCommand.helpCallback = callback;
    this.showHelpOnExit = true;
    return this;
  }
  version(version, customFlags = "-v, --version") {
    this.globalCommand.version(version, customFlags);
    this.showVersionOnExit = true;
    return this;
  }
  example(example) {
    this.globalCommand.example(example);
    return this;
  }
  outputHelp() {
    if (this.matchedCommand) {
      this.matchedCommand.outputHelp();
    } else {
      this.globalCommand.outputHelp();
    }
  }
  outputVersion() {
    this.globalCommand.outputVersion();
  }
  setParsedInfo({args, options}, matchedCommand, matchedCommandName) {
    this.args = args;
    this.options = options;
    if (matchedCommand) {
      this.matchedCommand = matchedCommand;
    }
    if (matchedCommandName) {
      this.matchedCommandName = matchedCommandName;
    }
    return this;
  }
  unsetMatchedCommand() {
    this.matchedCommand = void 0;
    this.matchedCommandName = void 0;
  }
  parse(argv = processArgs, {
    run = true
  } = {}) {
    this.rawArgs = argv;
    if (!this.name) {
      this.name = argv[1] ? getFileName(argv[1]) : "cli";
    }
    let shouldParse = true;
    for (const command of this.commands) {
      const parsed = this.mri(argv.slice(2), command);
      const commandName = parsed.args[0];
      if (command.isMatched(commandName)) {
        shouldParse = false;
        const parsedInfo = __assign(__assign({}, parsed), {
          args: parsed.args.slice(1)
        });
        this.setParsedInfo(parsedInfo, command, commandName);
        this.emit(`command:${commandName}`, command);
      }
    }
    if (shouldParse) {
      for (const command of this.commands) {
        if (command.name === "") {
          shouldParse = false;
          const parsed = this.mri(argv.slice(2), command);
          this.setParsedInfo(parsed, command);
          this.emit(`command:!`, command);
        }
      }
    }
    if (shouldParse) {
      const parsed = this.mri(argv.slice(2));
      this.setParsedInfo(parsed);
    }
    if (this.options.help && this.showHelpOnExit) {
      this.outputHelp();
      run = false;
      this.unsetMatchedCommand();
    }
    if (this.options.version && this.showVersionOnExit && this.matchedCommandName == null) {
      this.outputVersion();
      run = false;
      this.unsetMatchedCommand();
    }
    const parsedArgv = {args: this.args, options: this.options};
    if (run) {
      this.runMatchedCommand();
    }
    if (!this.matchedCommand && this.args[0]) {
      this.emit("command:*");
    }
    return parsedArgv;
  }
  mri(argv, command) {
    const cliOptions = [
      ...this.globalCommand.options,
      ...command ? command.options : []
    ];
    const mriOptions = getMriOptions(cliOptions);
    let argsAfterDoubleDashes = [];
    const doubleDashesIndex = argv.indexOf("--");
    if (doubleDashesIndex > -1) {
      argsAfterDoubleDashes = argv.slice(doubleDashesIndex + 1);
      argv = argv.slice(0, doubleDashesIndex);
    }
    let parsed = mri2(argv, mriOptions);
    parsed = Object.keys(parsed).reduce((res, name) => {
      return __assign(__assign({}, res), {
        [camelcaseOptionName(name)]: parsed[name]
      });
    }, {_: []});
    const args = parsed._;
    const options = {
      "--": argsAfterDoubleDashes
    };
    const ignoreDefault = command && command.config.ignoreOptionDefaultValue ? command.config.ignoreOptionDefaultValue : this.globalCommand.config.ignoreOptionDefaultValue;
    let transforms = Object.create(null);
    for (const cliOption of cliOptions) {
      if (!ignoreDefault && cliOption.config.default !== void 0) {
        for (const name of cliOption.names) {
          options[name] = cliOption.config.default;
        }
      }
      if (Array.isArray(cliOption.config.type)) {
        if (transforms[cliOption.name] === void 0) {
          transforms[cliOption.name] = Object.create(null);
          transforms[cliOption.name]["shouldTransform"] = true;
          transforms[cliOption.name]["transformFunction"] = cliOption.config.type[0];
        }
      }
    }
    for (const key of Object.keys(parsed)) {
      if (key !== "_") {
        const keys = key.split(".");
        setDotProp(options, keys, parsed[key]);
        setByType(options, transforms);
      }
    }
    return {
      args,
      options
    };
  }
  runMatchedCommand() {
    const {args, options, matchedCommand: command} = this;
    if (!command || !command.commandAction)
      return;
    command.checkUnknownOptions();
    command.checkOptionValue();
    command.checkRequiredArgs();
    const actionArgs = [];
    command.args.forEach((arg, index) => {
      if (arg.variadic) {
        actionArgs.push(args.slice(index));
      } else {
        actionArgs.push(args[index]);
      }
    });
    actionArgs.push(options);
    return command.commandAction.apply(this, actionArgs);
  }
}

const cac = (name = "") => new CAC(name);

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
}

var fs$1 = require("fs");
var path = require("path");
var _exec = require("child_process").exec;
var log$1 = console.log;
/**
 * 检查并自动安装依赖包
 * https://sourcegraph.com/github.com/vuejs/vue-cli/-/blob/packages/@vue/cli/lib/util/installDeps.js
 * @param {*} package 依赖包名
 * @returns
 */
var checkPackage = function (pack) {
    return new Promise(function (resolve, reject) {
        fs$1.exists(path.resolve(process.cwd() + "/node_modules/" + pack + "/"), function (exists) {
            if (!exists) {
                log$1("📦  正在安装依赖包: ", pack, "...");
                log$1("");
                var cwd_1 = "npm install --save-dev " + pack;
                var child = _exec(cwd_1, { silent: true });
                child.stdout.on("data", function (buffer) { return process.stdout.write(buffer); });
                child.on("close", function (code) {
                    if (code !== 0) {
                        reject("command failed: " + cwd_1);
                        return;
                    }
                    resolve(true);
                });
            }
            else {
                resolve(true);
            }
        });
    });
};
// 获取package文件路径
var getPackageJsonPath = function () {
    return path.resolve(process.cwd(), "package.json");
};
// 获取当前的package文件配置
var getPackage = function () {
    require(getPackageJsonPath());
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
function formatTime(time, cFormat) {
    if (arguments.length === 0)
        return null;
    if (("" + time).length === 10) {
        time = +time * 1000;
    }
    var format = cFormat || "{y}-{m}-{d} {h}:{i}:{s}";
    var date;
    if (typeof time === "object") {
        date = time;
    }
    else {
        date = new Date(time);
    }
    var formatObj = {
        y: date.getFullYear(),
        m: date.getMonth() + 1,
        d: date.getDate(),
        h: date.getHours(),
        i: date.getMinutes(),
        s: date.getSeconds(),
        a: date.getDay(),
    };
    var time_str = format.replace(/{(y|m|d|h|i|s|a)+}/g, function (result, key) {
        var value = formatObj[key];
        if (key === "a")
            return ["一", "二", "三", "四", "五", "六", "日"][value - 1];
        if (result.length > 0 && value < 10) {
            value = "0" + value;
        }
        return value || 0;
    });
    return time_str;
}

var fs = require("fs");
var inquirer = require("inquirer");
var chalk = require("chalk");
var semver = require("semver");
var git = require("simple-git/promise")(process.cwd());
var log = console.log;
var packageJsonPath = getPackageJsonPath();
var packageJson = getPackage();
// 配置不同环境的version属性名
var envConfig = { master: "version", pre: "version_pre", dev: "version_dev" };
var handleVersionTag = function () {
    inquirer
        .prompt([
        {
            name: "baseline",
            message: "\u9009\u62E9Tag\u57FA\u7EBF:",
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
            message: "\u9009\u62E9\u73AF\u5883:",
            type: "list",
            default: 2,
            choices: ["all", "master", "pre", "dev"],
        },
    ])
        .then(function (_a) {
        var baseline = _a.baseline, env = _a.env;
        return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        if (!(baseline === "package")) return [3 /*break*/, 2];
                        return [4 /*yield*/, addTagByPackage(env)];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, addTagByTags(env)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        git.push();
                        return [3 /*break*/, 6];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    });
};
/**
 * 根据Tag列表添加Tag
 *
 * @param {*} env
 */
function addTagByTags(env) {
    return __awaiter(this, void 0, void 0, function () {
        var tags, addTagSingle;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // const tags = fs.readdirSync('./.git/refs/tags') // 同步版本的readdir
                return [4 /*yield*/, commitAllFiles()];
                case 1:
                    // const tags = fs.readdirSync('./.git/refs/tags') // 同步版本的readdir
                    _a.sent();
                    return [4 /*yield*/, git.pull({ "--rebase": "true" })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, git.tags()];
                case 3:
                    tags = _a.sent();
                    addTagSingle = function (envName) { return __awaiter(_this, void 0, void 0, function () {
                        var reg, envTags, lastTag, lastVsersion, version;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    reg = new RegExp("^" + envName);
                                    envTags = tags.all.filter(function (tag) { return reg.test(tag); });
                                    lastTag = envTags[envTags.length - 1] || envName + "-v0.0.0-19000101";
                                    log(chalk(templateObject_1 || (templateObject_1 = __makeTemplateObject(["{gray \uD83C\uDFF7  \u4ED3\u5E93\u6700\u65B0\u7684Tag: ", "}"], ["{gray \uD83C\uDFF7  \u4ED3\u5E93\u6700\u65B0\u7684Tag: ", "}"])), lastTag));
                                    lastVsersion = lastTag.split("-")[1].substring(1);
                                    return [4 /*yield*/, generateNewTag(envName, lastVsersion)];
                                case 1:
                                    version = _a.sent();
                                    log(chalk(templateObject_2 || (templateObject_2 = __makeTemplateObject(["{gray \uD83C\uDFF7  \u751F\u6210\u6700\u65B0\u7684Tag: ", "}"], ["{gray \uD83C\uDFF7  \u751F\u6210\u6700\u65B0\u7684Tag: ", "}"])), version.tag));
                                    return [4 /*yield*/, createTag([version])];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    if (!(env === "all")) return [3 /*break*/, 5];
                    return [4 /*yield*/, Promise.all(Object.keys(envConfig).map(function (key) { return addTagSingle(key); }))];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, addTagSingle(env)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
}
function addTagByPackage(env) {
    return __awaiter(this, void 0, void 0, function () {
        var versionsPromise, versions, version, date, newTagsStr, error_1, e;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    versionsPromise = void 0;
                    if (env === "all") {
                        versionsPromise = Object.keys(envConfig).map(function (key) {
                            return generateNewTag(key, packageJson[envConfig[key]] || packageJson.version);
                        });
                    }
                    else {
                        versionsPromise = [
                            generateNewTag(env, packageJson[envConfig[env]] || packageJson.version),
                        ];
                    }
                    return [4 /*yield*/, Promise.all(versionsPromise)];
                case 1:
                    versions = _a.sent();
                    // #endregion
                    // #region 更新本地package.json文件，并将更新后的package信息写入本地文件中
                    versions.forEach(function (_a) {
                        var version = _a.version, env = _a.env;
                        packageJson[envConfig[env]] = version;
                        log(chalk(templateObject_3 || (templateObject_3 = __makeTemplateObject(["{green \uD83D\uDCE6  package.json \u6587\u4EF6\u6DFB\u52A0\u5C5E\u6027 => ", ": ", "}"], ["{green \uD83D\uDCE6  package.json \u6587\u4EF6\u6DFB\u52A0\u5C5E\u6027 => ", ": ", "}"])), envConfig[env], version));
                    }); // 更新package对应环境的version
                    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, "  "));
                    version = versions[0].version;
                    date = formatTime(new Date(), "{yy}{mm}{dd}");
                    newTagsStr = versions.map(function (version) { return version.tag; }).join(" / ");
                    log(chalk(templateObject_4 || (templateObject_4 = __makeTemplateObject(["{gray \u2795  \u6682\u5B58package.json\u6587\u4EF6\u53D8\u66F4}"], ["{gray \u2795  \u6682\u5B58package.json\u6587\u4EF6\u53D8\u66F4}"]))));
                    return [4 /*yield*/, git.add("./package.json")];
                case 2:
                    _a.sent();
                    log(chalk(templateObject_5 || (templateObject_5 = __makeTemplateObject(["{gray \u2714\uFE0F  \u63D0\u4EA4package.json\u6587\u4EF6\u53D8\u66F4}"], ["{gray \u2714\uFE0F  \u63D0\u4EA4package.json\u6587\u4EF6\u53D8\u66F4}"]))));
                    return [4 /*yield*/, git.commit("Relase version " + version + " in " + date + " by " + newTagsStr)];
                case 3:
                    _a.sent();
                    log(chalk(templateObject_6 || (templateObject_6 = __makeTemplateObject(["{green \uD83D\uDC4C  package.json\u6587\u4EF6\u64CD\u4F5C\u5B8C\u6210}"], ["{green \uD83D\uDC4C  package.json\u6587\u4EF6\u64CD\u4F5C\u5B8C\u6210}"]))));
                    // #endregion
                    return [4 /*yield*/, commitAllFiles()];
                case 4:
                    // #endregion
                    _a.sent();
                    return [4 /*yield*/, createTag(versions)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    e = error_1;
                    log(chalk(templateObject_7 || (templateObject_7 = __makeTemplateObject(["{red ", "}"], ["{red ", "}"])), e.message));
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * 创建Tag
 * @param {*} versions
 */
function createTag(versions) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    log(chalk(templateObject_8 || (templateObject_8 = __makeTemplateObject(["{green \uD83D\uDD00  \u66F4\u65B0\u672C\u5730\u4ED3\u5E93}"], ["{green \uD83D\uDD00  \u66F4\u65B0\u672C\u5730\u4ED3\u5E93}"]))));
                    return [4 /*yield*/, git.pull({ "--rebase": "true" })];
                case 1:
                    _a.sent();
                    versions.forEach(function (version) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    log(chalk(templateObject_9 || (templateObject_9 = __makeTemplateObject(["{green \uD83C\uDFF7  \u521B\u5EFA\u6807\u7B7E ", "}"], ["{green \uD83C\uDFF7  \u521B\u5EFA\u6807\u7B7E ", "}"])), version.tag));
                                    return [4 /*yield*/, git.addTag(version.tag)];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    });
}
// #endregion
// #region commit 所有未提交的文件
/**
 * commit 所有未提交的文件
 */
function commitAllFiles() {
    return __awaiter(this, void 0, void 0, function () {
        var statusSummary;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, git.status()];
                case 1:
                    statusSummary = _a.sent();
                    if (!statusSummary.files.length) return [3 /*break*/, 4];
                    log(chalk(templateObject_10 || (templateObject_10 = __makeTemplateObject(["{red \uD83D\uDEA8  \u6709\u672A\u63D0\u4EA4\u7684\u6587\u4EF6\u53D8\u66F4}"], ["{red \uD83D\uDEA8  \u6709\u672A\u63D0\u4EA4\u7684\u6587\u4EF6\u53D8\u66F4}"]))));
                    log(chalk(templateObject_11 || (templateObject_11 = __makeTemplateObject(["{gray \u2795  \u6682\u5B58\u672A\u63D0\u4EA4\u7684\u6587\u4EF6\u53D8\u66F4}"], ["{gray \u2795  \u6682\u5B58\u672A\u63D0\u4EA4\u7684\u6587\u4EF6\u53D8\u66F4}"]))));
                    return [4 /*yield*/, git.add("./*")];
                case 2:
                    _a.sent();
                    log(chalk(templateObject_12 || (templateObject_12 = __makeTemplateObject(["{gray \u2714\uFE0F  \u63D0\u4EA4\u672A\u63D0\u4EA4\u7684\u6587\u4EF6\u53D8\u66F4}"], ["{gray \u2714\uFE0F  \u63D0\u4EA4\u672A\u63D0\u4EA4\u7684\u6587\u4EF6\u53D8\u66F4}"]))));
                    return [4 /*yield*/, git.commit("🚀")];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * 生成新Tag
 * @param {*} env master|pre|dev|all
 * @param {*} version
 */
function generateNewTag(env, version) {
    if (env === void 0) { env = "pre"; }
    if (version === void 0) { version = "0.0.0"; }
    return new Promise(function (resolve, reject) {
        // const major = semver.major(version)
        var minor = semver.minor(version);
        var patch = semver.patch(version);
        var date = formatTime(new Date(), "{yy}{mm}{dd}");
        var config = { env: env, version: version, tag: env + "-v" + version + "-" + date };
        if (patch >= 99) {
            config.version = semver.inc(version, "minor");
        }
        else if (minor >= 99) {
            config.version = semver.inc(version, "major");
        }
        else {
            config.version = semver.inc(version, "patch");
        }
        config.tag = env + "-v" + config.version + "-" + date;
        resolve(config);
    });
}
var handleVersionTag$1 = (function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("handleVersionTag");
                return [4 /*yield*/, Promise.all([
                        checkPackage("inquirer"),
                        checkPackage("chalk"),
                        checkPackage("simple-git"),
                        checkPackage("semver"),
                    ]).then(function () { return handleVersionTag(); })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12;

var cli = cac();
// 当用户只输入version时，显示其他command的友好提示
cli.command("").action(function () {
    cli.outputHelp();
});
// version gen时执行，支持传入option参数，来控制流程
cli
    .command("tag", "Generate Tag for Current Version")
    // .option("-k, --keepFolderStructure", "keep original folder structure")
    .allowUnknownOptions()
    .action(function () {
    handleVersionTag$1();
});
cli.help();
cli.parse();

if(typeof window !== 'undefined') {
  window._Dry_VERSION_ = '1.0.0'
}
