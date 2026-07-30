# 祝雪峰教授个人学术主页

中文静态学术网站，适用于 GitHub Pages。

## 内容维护

- 页面结构与样式：`site/index.html`
- 研究方向、论文与成果数据：`site/content.js`
- 自动部署：`.github/workflows/pages.yml`

编辑 `site/content.js` 中的数组即可批量增加或修改内容。提交到 `main` 分支后，GitHub Actions 会自动重新部署。

## 发布

将仓库设为 Public，然后在 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
