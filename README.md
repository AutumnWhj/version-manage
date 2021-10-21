此包可作为CLI命令行基础模板，往里面不断添加新的功能，目前的功能为：把html文件的css样式批量转成内联样式，以运用于发送邮件、在第三方网站中嵌入HTML、从其他编辑器拷贝编辑好的文章发布到微信、今日头条自媒体等场景。<br />

<a name="QVJIX"></a>
## 使用一：
npm包安装（待发包）
<a name="ANagF"></a>
## 使用二：
拉取代码
```javascript
git clone git@github.com:AutumnWhj/html2email.git
```
安装依赖&启动项目
```javascript
// 没有yarn可通过 npm install -g yarn 安装
yarn
// 编译打包ts代码
yarn build
```
链接到全局环境
```javascript
npm link // yarn link
```
接着就可以使用命令了。<br />​

html2email命令<br />目前就只有`html2email gen`命令执行。<br />还有其他的配置如下
```javascript
export type CliOptions = {
  include: string | string[]
  exclude: string | string[]
  outDir: string
  title: string
  keepFolderStructure: boolean
}
include：包含文件的路径
exclude：排除的文件路径
outDir：导出的目录
title：导出目录的title
keepFolderStructure：是否保持文件在原有目录的结构
```
有条件的小伙伴可以直接在目录下新建`package.json`或者`html2email.json`文件来覆盖默认配置项。
