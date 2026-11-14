# Intel 主板与散热器官方冲突记录

核对日期：2026-11-14。仅收录品牌官方资料；结果适用于表内完整型号，不外推同系列其他主板。插槽支持不代表逐主板安装通过。这里的“有条件兼容”是网站建议状态，对应官方警告及附带安装要求；“待确认”不能转成通过。

## 风冷：Noctua

| 主板                                 | 插槽    | 散热器 / 网站 ID                      | 状态       | 原因与处理                                                                        | 来源                                                                                                                          |
| ------------------------------------ | ------- | ------------------------------------- | ---------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ASUS ROG Strix Z690-I Gaming WIFI    | LGA1700 | NH-U12A / `u12a`                      | 不兼容     | VRM 散热片高度造成机械干涉；官方未给解决措施，改选型号                            | [官方逐板表](https://www.noctua.at/en/compatibility/by-components/motherboards/asus-rog-strix-z690-i-gaming-wifi)             |
| ASUS ROG Strix Z690-I Gaming WIFI    | LGA1700 | NH-D15 G2 / `d15g2`                   | 不兼容     | VRM 散热片高度造成机械干涉；官方未给解决措施，改选型号                            | [官方逐板表](https://www.noctua.at/en/compatibility/by-components/motherboards/asus-rog-strix-z690-i-gaming-wifi)             |
| ASUS ROG Strix Z690-A Gaming WIFI D4 | LGA1700 | NH-U12A / `u12a`                      | 有条件兼容 | 标准朝 I/O 挡板方向不兼容；旋转 90° 朝机箱顶部吹风；2022-01-01 前购买的需升级扣具 | [官方逐板表](https://www.noctua.at/en/compatibility/by-components/motherboards/asus-rog-strix-z690-a-gaming-wifi-d4)          |
| ASUS ROG Strix Z690-E Gaming WIFI    | LGA1700 | NH-U12A / `u12a`                      | 有条件兼容 | 标准朝 I/O 挡板方向不兼容；旋转 90° 朝机箱顶部吹风；2022-01-01 前购买的需升级扣具 | [官方逐板表](https://www.noctua.at/en/compatibility/by-components/motherboards/asus-rog-strix-z690-e-gaming-wifi)             |
| ASRock B860I WiFi                    | LGA1851 | NH-D15 G2 / `d15g2`                   | 有条件兼容 | 只可采用官方 orientation 1；超出主板北侧约 15 mm，另核机箱空间                    | [官方逐板表及方向图入口](https://www.noctua.at/en/compatibility/by-components/motherboards/asrock-b860i-wifi)                 |
| ASUS ROG Strix B860-I Gaming WIFI    | LGA1851 | NH-D15 G2 / `d15g2`                   | 有条件兼容 | 只可采用官方 orientation 1；超出主板北侧约 20 mm，另核机箱空间                    | [官方逐板表及方向图入口](https://www.noctua.at/en/compatibility/by-components/motherboards/asus-rog-strix-b860-i-gaming-wifi) |
| EVGA Z790 Classified                 | LGA1700 | NH-D15 G2 / `d15g2`、NH-U12A / `u12a` | 待确认     | 官方仍在评估，没有安装通过结论                                                    | [官方逐板表](https://www.noctua.at/en/compatibility/by-components/motherboards/evga-z790-classified)                          |

注意：orientation 1 是官方图示编号，不在未查看方向图时自行翻译成“旋转 90°”。NH-D15 与 NH-D15 G2 为不同产品，不互相继承安装冲突记录。

## 水冷：ARCTIC Liquid Freezer III

以下均来自 [ARCTIC 官方逐板兼容表](https://support.arctic.de/lf3-compatibility)，适用 `lf3360` 的泵体与主板检查；仍须单独检查 360 冷排与机箱。

| 主板                                       | 插槽    | 状态       | 原因 / 措施                              |
| ------------------------------------------ | ------- | ---------- | ---------------------------------------- |
| ASUS ROG Maximus Z790 Apex                 | LGA1700 | 有条件兼容 | M.2_1 散热片碰泵体；申请替换散热片       |
| ASUS ROG Maximus Z790 Apex Encore          | LGA1700 | 有条件兼容 | 同上                                     |
| GIGABYTE Z690 AORUS Master                 | LGA1700 | 有条件兼容 | 同上                                     |
| ASUS ProArt Z890-Creator WIFI              | LGA1851 | 有条件兼容 | 同上                                     |
| MSI B860 Gaming Plus WIFI                  | LGA1851 | 有条件兼容 | 同上                                     |
| ASUS ROG Strix Z690-I Gaming WIFI          | LGA1700 | 不兼容     | 官方仅给不兼容结论，未说明原因或修复措施 |
| ASRock Phantom Gaming B760I Lightning WiFi | LGA1700 | 不兼容     | 同上                                     |
| ASUS ROG Strix Z890-I Gaming WIFI          | LGA1851 | 不兼容     | 同上                                     |

对官方标注 M.2 干涉的 Intel 组合，品牌建议可先尝试泵头旋转 180°；也可附主板发票申请免费替换 M.2 散热片。不能把旋转措施自动套用到官方明确“不兼容”的记录。[官方 Intel 安装补充说明](https://support.arctic.de/lf3-m2modif)

## Thermalright PS120 SE 的证据边界

本次未取得品牌官方逐主板冲突清单。官方产品页支持 LGA1700/LGA1851，并要求核对机箱安装高度及高内存空间；只能证明插槽支持，不能据此把任一主板标为已验证兼容。[官方产品页](https://www.thermalright.com/product/phantom-spirit-120-se/)

## 数据接入建议

- `status` 分开保存 `incompatible`、`conditional`、`unverified`，不将所有 warning 图标视为同一结果。
- 以完整主板型号和散热器 ID 建关联；D4、I、Encore 等后缀必须保留。
- `reason`、`mitigation`、`sourceUrl`、`checkedAt` 必须随记录展示。
- 不兼容记录阻止普通推荐；有条件兼容显示条件并要求落实；待确认不计入“已验证通过”。
- 兼容表只证明安装范围。散热性能、噪声、功耗测试须另有横评证据。
