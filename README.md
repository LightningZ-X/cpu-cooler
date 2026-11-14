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

- Intel LGA1700 / LGA1851，收录 4 款 CPU、2 款主板、4 款散热器；其他主板支持手动输入。
- 检查 CPU/主板插槽、扣具、风冷高度、内存净空、风扇抬高、水冷安装位和总厚度。
- 主板逐型号安装组合未获得依据时保持待确认，已知冲突明确显示。
- 用途、功耗设置、维护偏好排序；不将规则排序当成温度或噪声测试。
- 用户输入实际报价后按预算筛选，未知报价不当作免费。
- 最多三款对比、本地保存、配置链接分享、移动端布局。

## 数据与适用边界

`data/catalog.json` 保存官方规格与来源，核对日期为 2026-11-14。价格未采集；产品插图为散热类型示意，不是实拍。

当前尚未收录主板和散热器逐型号的已验证适配记录，因此不会给出完整安装兼容保证。主板 CPU 支持列表、BIOS、扣具版本及安装手册仍需核对。风冷限高、内存高度及水冷空间由用户提供。

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
