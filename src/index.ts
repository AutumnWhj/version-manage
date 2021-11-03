
import genHtml2InlineCSS from './genHtml2InlineCss'
import genHtmlExtractCss from './genHtmlExtractCss'
import cac from 'cac'
const cli = cac()

const JoyCon = require('joycon')
const joycon = new JoyCon({
  packageKey: 'html2email'
})

export type CliOptions = {
  include: string | string[]
  exclude: string | string[]
  outDir: string
  title: string
  keepFolderStructure: boolean
}
type PartialCliOptions = Partial<CliOptions>


async function getConfig(
  flags: PartialCliOptions
): Promise<Partial<CliOptions>> {
  const { path, data } = await joycon.load([
    'package.json',
    'html2email.json'
  ])
  const config: PartialCliOptions = {
    title: 'template',
    include: '**/*.html',
    exclude: [],
    outDir: 'outputHtml',
    keepFolderStructure: true
  }
  if (path) Object.assign(config, data, flags)
  Object.assign(config, flags || {})
  return config
}
// 当用户只输入html2email时，显示其他command的友好提示
cli.command('').action(() => {
  cli.outputHelp()
})
// html2email gen时执行，支持传入option参数，来控制流程
cli
  .command('gen', 'Generate target resources')
  .option('-k, --keepFolderStructure', 'keep original folder structure')
  .allowUnknownOptions()
  .action(async (flags: Partial<CliOptions>) => {
    const config = await getConfig(flags)
    genHtml2InlineCSS(config as CliOptions)
  })

cli
  .command('css', 'extract css resources')
  .option('-k, --keepFolderStructure', 'keep original folder structure')
  .allowUnknownOptions()
  .action(async (flags: Partial<CliOptions>) => {
    const config = await getConfig(flags)
    console.log(11111111)
    genHtmlExtractCss(config as CliOptions)
  })


cli.help()

cli.parse()
