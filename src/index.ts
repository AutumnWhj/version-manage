import cac from "cac";
import handleVersionTag from "./version";
const cli = cac();

// 当用户只输入version时，显示其他command的友好提示
cli.command("").action(() => {
  cli.outputHelp();
});
// version tag时执行，支持传入option参数，来控制流程
cli
  .command("tag", "Generate Tag for Current Version")
  .allowUnknownOptions()
  .action(() => {
    handleVersionTag();
  });

cli.help();

cli.parse();
