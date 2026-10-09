# 竖屏车厢交互原型快照

保存当前本地网站的完整原型和素材，供设计回顾与后续 React/TypeScript 迁移使用。本目录不参与正式应用构建或 GitHub Pages 部署。

## 本地预览

从仓库根目录运行：

```sh
python3 -m http.server 8787 --bind 127.0.0.1 --directory prototypes/portrait-window
```

打开 http://127.0.0.1:8787/ 。

包括竖屏车厢、木窗关闭与重新打开换景、原有内嵌电视、相册、待办抽屉、旅行手帐与录音入口。记录保存在浏览器本地；录音需麦克风授权。ASR 与云端数据库尚未接入。不要将 API 密钥放入前端文件。

这是原始设计原型归档，正式功能应遵守仓库 React、TypeScript 规范迁移后再发布。
