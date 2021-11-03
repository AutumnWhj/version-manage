
import fs from 'fs-extra'
import path from 'path'
import { getGlobPatternMatchPath } from '../utils'
export const outputFiles = async (pathOption, file) => {
  const {outDir, include,keepFolderStructure, pathFile} = pathOption || {}
  const dirPath = path.dirname(pathFile)
  // fs输出最终文件
  let targetDir = outDir? path.resolve(
    outDir
  ) : dirPath

  let targetFile = path.basename(pathFile)
  const folderStructureMiddlePath: string = keepFolderStructure
    ? getGlobPatternMatchPath(include as string[], dirPath)
    : ''
  const target = path.resolve(
    targetDir,
    folderStructureMiddlePath,
    targetFile
  )
  await fs.ensureDir(path.resolve(targetDir, folderStructureMiddlePath))
  await fs.writeFile(target, file, 'utf8')
}