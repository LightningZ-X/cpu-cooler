# v1.9 型号扩充依据

核查日期：2026-11-16。新增 7 款散热器、8 款 Intel 主板；总计 36 款散热器、40 款主板。只补充官方型号与安装规格，不新增未经验证的温度成绩、价格或安装通过记录。

## 散热器

| 精确型号                                 | 官方核实数据                                                                           | 来源                                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Thermalright Assassin Spirit 120 EVO     | LGA1700/1851；塔体高 156 mm；4 根 6 mm 热管；底座与 Fin 工艺未确认                     | [官方规格](https://www.thermalright.com/product/assassin-spirit-120-evo/)                                                                                                                        |
| Thermalright Burst Assassin 120          | LGA1700/1851；高 154 mm；6 根 6 mm 热管；镀镍 C1100 铜底                               | [官方规格](https://www.thermalright.com/product/burst-assassin-120/)                                                                                                                             |
| Thermalright Silver Soul 135             | LGA1700/1851；高 135 mm；6 根 6 mm 热管；镀镍 C1100 铜底                               | [官方规格](https://www.thermalright.com/product/silver-soul-135/)                                                                                                                                |
| Noctua NH-D12L（棕色原版）               | LGA1700/1851；含风扇高 145 mm；5 根 6 mm 热管；镀镍铜底；热管与鳍片 Soldered；NSPR 148 | [官方规格](https://www.noctua.at/en/products/nh-d12l/specifications)                                                                                                                             |
| Noctua NH-U9S（棕色原版）                | LGA1700/1851；含风扇高 125 mm；5 根 6 mm 热管；镀镍铜底；热管与鳍片 Soldered；NSPR 93  | [官方规格](https://www.noctua.at/en/products/nh-u9s/specifications)                                                                                                                              |
| Thermalright Frozen Notte 360 BLACK ARGB | LGA1700/1851；冷排 397×120×27 mm；风扇厚 25 mm                                         | [官方页面](https://www.thermalright.com/product/frozen-notte-360-black-argb/)、[官方尺寸图](https://www.thermalright.com/wp-content/uploads/2022/08/FN-360.jpg)                                  |
| Thermalright Frozen Prism 240 BLACK ARGB | LGA1700/1851；冷排 276×120×27 mm；风扇厚 25 mm                                         | [官方页面](https://www.thermalright.com/product/frozen-prism-240-black-argb/)、[官方尺寸图](https://www.thermalright.com/wp-content/uploads/2023/02/%E5%86%B0%E5%B0%81%E6%A3%B1%E9%95%9C240.jpg) |

两款水冷的尺寸来自官网 Blueprint Dimension 链接，已目视核对原图；52 mm 是冷排加一层风扇的名义叠厚，仍需另留制造公差、螺丝及管路空间。不能由水泵功率推出 CPU 散热能力。

NH-D12L 官方规格确认标准单风扇配置不覆盖内存插槽，录入 `ramOverhang: false`；加装前风扇后需重新核对。其余新风冷内存净空仍为未知。Soldered 只记录焊接，不能自行细化成回流焊。两款 Noctua 的 NSPR 是厂商评分，不能换算为瓦数；所有新增型号的整机最大解热瓦数保持未知。

未复制其他型号产品照片；未设 `image` 的新记录使用现有标明用途的风冷/水冷示意图。未把棕色原版与 chromax.black、EVO 与其他版本、240 与 360 的测试成绩混用。

## 主板

| 精确型号                                      | 插槽    | 官方依据                                                                                        |
| --------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| ASRock B860 Steel Legend WiFi                 | LGA1851 | [手册第 1.2 节，印刷页 2](https://download.asrock.com/Manual/B860%20Steel%20Legend%20WiFi.pdf)  |
| ASRock B860M Steel Legend WiFi                | LGA1851 | [手册第 1.2 节，印刷页 2](https://download.asrock.com/Manual/B860M%20Steel%20Legend%20WiFi.pdf) |
| ASRock B860 Pro RS WiFi                       | LGA1851 | [手册第 1.2 节，印刷页 2](https://download.asrock.com/Manual/B860%20Pro%20RS%20WiFi.pdf)        |
| ASRock B860M Pro RS WiFi                      | LGA1851 | [手册第 1.2 节，印刷页 2](https://download.asrock.com/Manual/B860M%20Pro%20RS%20WiFi.pdf)       |
| ASRock Z890 Pro RS WiFi                       | LGA1851 | [手册第 1.2 节，印刷页 2](https://download.asrock.com/Manual/Z890%20Pro%20RS%20WiFi.pdf)        |
| ASRock Z890 Steel Legend WiFi                 | LGA1851 | [手册第 1.2 节，印刷页 2](https://download.asrock.com/Manual/Z890%20Steel%20Legend%20WiFi.pdf)  |
| ASRock B760M Steel Legend WiFi                | LGA1700 | [官方产品页](https://www.asrock.com/mb/Intel/B760M%20Steel%20Legend%20WiFi/index.asp)           |
| ASRock B760M Pro RS（DDR5，非 D4/非 WiFi 版） | LGA1700 | [官方产品页](https://www.asrock.com/mb/Intel/B760M%20Pro%20RS/index.asp)                        |

ASRock 新版网页的规格区未完整返回静态正文，LGA1851 型号进一步追溯官方 PDF 手册核对。以上记录只表示插槽匹配，不表示具体 CPU 已获得 BIOS 支持，也不表示散热器一定避开 VRM、I/O 或 M.2 散热装甲。新增主板没有对应的安装验证覆盖，组合检查保留未知。

## 验证

- 原有安装记录与型号均保留，新增 ID 不重复。
- 产品工艺来源检查、安装覆盖检查及全套 Node 测试通过。
- 额外逐项检查新主板与新散热器组合：匹配插槽的主板安装干涉仍为 `unknown`，没有因型号入库而自动变成通过。
