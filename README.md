# CoolerGuide · 散热器选择指南

为 Intel 台式机提供 CPU 散热器兼容性检查与选型建议。原生 HTML、CSS、JavaScript，无第三方运行依赖。

## 本地运行

安装 Node.js 22 或更新版本，在项目目录运行：

```sh
npm start
```

访问 http://127.0.0.1:4173 。请通过 HTTP 服务器访问，不要直接双击 HTML，产品 JSON 数据需通过 fetch 加载。

```sh
npm test
```

## 功能

- Intel LGA1700 / LGA1851，收录 7 款 CPU、14 款主板、13 款散热器；其他主板支持手动输入。
- 检查 CPU/主板插槽、扣具、风冷高度、内存净空、风扇抬高、水冷安装位和总厚度。
- 主板逐型号安装组合未获得依据时保持待确认，已知冲突明确显示。
- 用途、功耗设置、维护偏好排序；不将规则排序当成温度或噪声测试。
- 用户输入实际报价后按预算筛选，未知报价不当作免费。
- 最多三款对比、本地保存、配置链接分享、移动端布局。

## 数据与适用边界

`reviews.html` 提供 51972 评测资料库，可按标题、BV 号、年份与类别筛选。数据文件位于 `data/reviews/`，原始出处与核查范围见 `docs/51972-research.md`。

当前取得最新 50 / 214 条公开投稿目录，并补充较早原视频索引。已核对 19 条 51972 图表温度与 2 条 GamersNexus 风冷/水冷同噪温差，保存在 `benchmarks.json`；保留原始出处、CPU、功耗、风扇模式、温度口径和未知条件。只有选定组与 CPU、设置功耗、持续负载用途对应时才参考同组已参测型号，不跨组拼总榜。

`python tools/collect-51972.py` 可手动刷新公开目录。遇到访问限制时停止并保存部分进度，不使用账号凭据或下载视频。目录分类按标题关键词初筛，需要人工检查；目录采集完成也不等于视频核查完成。

`data/catalog.json` 保存官方规格与来源，核对日期为 2026-11-14。价格未采集；产品插图为散热类型示意，不是实拍。

当前收录 15 条主板和散热器逐型号安装记录，涵盖 VRM、M.2 干涉与方向限制；不等于对所有组合提供完整安装兼容保证。主板 CPU 支持列表、BIOS、扣具版本及安装手册仍需核对。风冷限高、内存高度及水冷空间由用户提供。

`overrides` 用于后续补充有证据的主板组合结论，条目格式：

```json
{
  "board": "主板 ID",
  "cooler": "散热器 ID",
  "state": "pass 或 conditional 或 fail",
  "detail": "适配结论及适用条件",
  "source": "官方依据 URL",
  "checkedAt": "YYYY-MM-DD"
}
```

不能仅凭没有冲突记录标记通过。扩展 AMD 时添加平台数据及扣具规则，并补充相应兼容性测试。

## GitHub Pages

1. 将仓库推送到 GitHub 的 `main` 分支。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
3. Actions 中运行 **Verify and deploy Pages**。

工作流先执行规则测试，再上传必要静态文件并部署；使用相对路径，兼容 `用户名.github.io/仓库名/`。私有仓库的 Pages 可用性及访问范围取决于 GitHub 套餐与设置。

目录说明：`css` 样式，`js` 交互及规则，`data` 产品数据，`assets` 本地 SVG 示意图，`tests` 边界测试，`tools` 本地预览服务器。

## 新品与独立评测补充

新增 CQ125、V8 ACE 3DHP Intel、CC90 Black、AK500S DIGITAL、AK700 DIGITAL NYX、AG500 G2 无光版。CQ125 安装高度与 LGA1700 扣具缺一手证据，保持待确认。新品 270K Plus 约 280W 全速组收录 2 条温度读数；未确认料号的其它新品不套用近似版本成绩。选型页支持型号搜索。
