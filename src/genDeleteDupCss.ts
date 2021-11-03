import postcss from 'postcss'
import plugin from './plugin/deleteCss.js'

export const genDeleteDupCss = async (source, opts={}) => {
  let result = await postcss([plugin(opts)]).process(source, {
    from: undefined,
  });
  const { css } = result || {}
  return css
}
