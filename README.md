# 冬日账本 · 无尽冬日性价比模型

公开内测版 v1.9 Beta 1。支持礼包估值、服务器进度价格、库存时间记录、火晶精炼和多系统提升规划。

## 数据保存

公开版的库存、当前等级和方案仅保存在访问者自己的浏览器。不会上传或共享个人记录。可导出、导入 JSON 备份，更换设备或清理浏览器数据前请先备份。项目发布不包含维护者的个人库存与备份。道具价格由项目维护者统一维护。

## 本地运行

需要 Node.js 22 或以上，无第三方运行依赖。运行 npm start 后访问 http://127.0.0.1:5173/ 。本地版支持本机 storage 目录存档，该目录不会上传。

## 发布 GitHub Pages

仓库 Settings → Pages → Source 选择 GitHub Actions。推送 main 后，Pages 工作流自动检查、构建并发布 dist。构建自动读取仓库名处理网址子路径。

手动构建：npm run build:public -- --base-path=/仓库英文名/ 。自定义域名或根站点使用 --base-path=/ 。本地预览：npm run preview:public 。

构建仅包含 index.html、src 和所需 public 资源；不含 storage、artifacts、本地参考资料与备份。两组依赖离线研究档案的校验保留在维护者本地项目，发布仓库不携带离线网页档案。

## 内测范围

部分科技、专家和宠物的属性或消耗仍待补充，界面会标明未知，不将已知部分当成完整结论。当前是材料估值和提升测算工具，尚不承诺跨系统全局最优路线。

## 资料来源

礼包资料：[冬日工具箱](https://wjgl.store/)；道具名称与贴图：[WosGift](https://wosgift.com/zh-cn/items/)；研究资料：[Whiteout Survival Wiki](https://www.whiteoutsurvival.wiki/)。具体价格、奖励与各级消耗的来源随数据记录。游戏素材权利归原权利人，本站为非官方玩家工具。
