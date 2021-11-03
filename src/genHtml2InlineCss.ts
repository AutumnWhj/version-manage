import path from 'path'
import fg from 'fast-glob'
import fs from 'fs-extra'
const inlineCss = require('inline-css');
import { CliOptions } from '.'

import {outputFiles} from './plugin/outputFiles'

export default async (config: CliOptions) => {
  let {
    include,
    exclude,
  } = config
  if (typeof include === 'string') include = [include]
  if (typeof exclude === 'string') exclude = [exclude]
  const files = await fg(include.concat(exclude.map(p => `!${p}`)))
  return files.map(async (p: string) => {
    // fs读取源文件
    const abs = path.resolve(p)
    const source = await fs.readFile(abs, 'utf-8')
    try {
      const rootPath = process.cwd()
      // 把html css都转成内联样式
      const parserHtml = await inlineCss(source, {
        url:`file://${rootPath}/`
      })
      const pathOption = {
        ...config,
        pathFile: p,
      }
      await outputFiles(pathOption,parserHtml) 
    } catch (error) {
      console.log('genHtml2InlineCss throw error---- ', error)
    }
  })
}

