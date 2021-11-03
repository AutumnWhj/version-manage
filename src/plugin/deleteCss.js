const defOpts = {
  // 是否删除空的样式
  isRemoveNull: false,
  // 是否删除所有的注释
  isRemoveComment: false,
};
module.exports = (opts = defOpts) => {
  // Work with options here
  return {
    postcssPlugin: "postcss-delete-duplicate-css",

    Root(root) {
      // Transform CSS AST here

      opts.isRemoveComment &&
        root.walkComments((comment) => {
          comment.remove();
        });

      const nSet = new Set();
      root.walkRules(function (rule) {
        const { type, selector } = rule;
        let flag = true;
        // console.log(`type:${type}/selector:${selector}`)
        // text = rule_ul li_padding:5px;width:10px;
        let text = `${type}_${selector}_`;
        let decls = [];
        rule.walkDecls(function (decl) {
          flag = false;
          // text += `${decl.prop}:${decl.value};`
          // 为什么要换成数组?如果样式的内容一样,但是位置不同,比如: a{width:10px;padding:10px} a{padding:10px;width:10px}
          decls.push(`${decl.prop}:${decl.value}`);
        });
        text += decls.sort().join(";");
        if (opts.isRemoveNull && flag) {
          rule.remove();
        }
        if (!nSet.has(text)) {
          nSet.add(text);
        } else {
          rule.remove();
        }
      });
    },

    /*
    Declaration (decl, postcss) {
      // The faster way to find Declaration node
    }
    */

    /*
    Declaration: {
      color: (decl, postcss) {
        // The fastest way find Declaration node if you know property name
      }
    }
    */
  };
};
module.exports.postcss = true;