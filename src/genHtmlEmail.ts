import path from 'path'
import fg from 'fast-glob'
import fs from 'fs-extra'
const inlineCss = require('inline-css');
import { CliOptions } from '.'

// 返回值类型
type HtmlEmailResult = Promise<
  Promise<
    | {
        compName: string
        groupName: string
        content: string
      }
    | undefined
  >[]
>
export default async (config: CliOptions) => {
  let {
    include,
    exclude,
    outDir,
    keepFolderStructure
  } = config
  if (typeof include === 'string') include = [include]
  if (typeof exclude === 'string') exclude = [exclude]
  const files = await fg(include.concat(exclude.map(p => `!${p}`)))
  console.log('files', files)
  return files.map(async (p: string) => {
    // fs读取源文件
    const abs = path.resolve(p)
    const source = await fs.readFile(abs, 'utf-8')
    // 转换成email支持的html css内联格式
    try {
      const parserHtml = await inlineCss(source, {
        url: 'filePath'
      })
      const compName = path.basename(abs)

      // fs输出最终文件
      let targetDir = outDir? path.resolve(
        outDir
      ) : path.dirname(abs)

      let targetFile = compName
      const folderStructureMiddlePath: string = keepFolderStructure
        ? getGlobPatternMatchPath(include as string[], path.dirname(p))
        : ''
      const target = path.resolve(
        targetDir,
        folderStructureMiddlePath,
        targetFile
      )
      await fs.ensureDir(path.resolve(targetDir, folderStructureMiddlePath))
      await fs.writeFile(target, parserHtml)
      return {
        compName,
        groupName: '',
        content: parserHtml
      }
    } catch (error) {
      console.log('error---- ', error)
    }
  })
}

function getGlobPatternMatchPath(
  globPatternList: string[],
  targetPath: string
): string {
  let index = Infinity
  let res = ''
  for (let i = 0; i < globPatternList.length; i++) {
    let ep: string = explicitPrefix(globPatternList[i])
    if (targetPath.startsWith(ep) && ep.length < index) {
      index = ep.length
      res = ep
    }
  }
  res = targetPath.slice(res.length)
  return res[0] === '/' ? res.slice(1) : res
}

function explicitPrefix(pattern: string): string {
  let patternList = pattern.split('/')
  let resi = 0
  while (patternList[resi] && patternList[resi] !== '**') {
    resi++
  }
  return patternList.slice(0, resi).join('/')
}