import path from 'path'
import fg from 'fast-glob'
import {decode} from 'html-entities'
const extractCss = require('extract-inline-css')
import { CliOptions } from '.'

import { genDeleteDupCss } from './genDeleteDupCss'
import {outputFiles} from './plugin/outputFiles'
export default async (config: CliOptions) => {
  let {
    include,
    exclude
  } = config
  if (typeof include === 'string') include = [include]
  if (typeof exclude === 'string') exclude = [exclude]
  const files = await fg(include.concat(exclude.map(p => `!${p}`)))
  console.log('files-------', files)
  let cssString = ''
  const {length} = files
  for (let index = 0; index < length; index++) {
    const p = files[index];
    // fs读取源文件
    const abs = path.resolve(p)
    try {
      const name = path.basename(abs)
      // 把html css提取到一个文件，以便去重，以及统一修改
      const res = extractCss(abs, {
        out: 'object',
        formatHtml: true
      });
      
      const { css, html } = res || {}
      if(css) {
        cssString += `/*----${name} start----*/\n${css}\n/*----${name} end----*/\n`
      }
      const pathOption = {
        ...config,
        pathFile: p,
      }
      const text = decode(html)
      await outputFiles(pathOption, text) 
    } catch (error) {
      console.log('error---- ', error)
    }
  }
  // fs输出最终css文件
  const resultCss = await genDeleteDupCss(cssString)
  const pathOption = {
    ...config,
    keepFolderStructure: false,
    pathFile: 'extract.css',
  }
  await outputFiles(pathOption, resultCss) 
}

