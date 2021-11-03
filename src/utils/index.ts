export const getGlobPatternMatchPath = (
  globPatternList: string[],
  targetPath: string
): string => {
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

export const explicitPrefix = (pattern: string): string => {
  let patternList = pattern.split('/')
  let resi = 0
  while (patternList[resi] && patternList[resi] !== '**') {
    resi++
  }
  return patternList.slice(0, resi).join('/')
}
