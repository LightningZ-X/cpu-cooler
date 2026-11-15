# 散热器结构与厂商标称功耗核对

核对日期：2026-11-15。范围为当前 catalog 的 29 个精确型号。仅采用厂商官网产品规格、厂商兼容表和官方解释；不把电商描述、媒体转述或从图片观察推断当作已确认规格。

## 字段含义与显示边界

- 热管根数计算完整管件，不能数裸露端头；V8 ACE 的额外分支不是额外完整热管。
- `finJoint` 仅表示热管与鳍片的接口，**不表示铜底与热管的连接**。直触、铜底、镀镍、CTT 2.0、SCHP 等都不能证明鳍片是回流焊。
- `soldered` 显示“焊接（官方未细分制程）”。官网只写 Soldered 时，不能进一步断言为回流焊。`press-fit` 显示“穿 Fin / 压合”。本轮没有查到足够的官方依据可标注“混合”或具体“回流焊”制程。
- 一体式水冷的风冷热管根数、热管/鳍片连接方式不适用；它的冷排钎焊工艺是另一字段，不能混用。
- `thermalRating.watts` 为厂商**标称** TDP/D-TDP，不是网站实测最大解热能力，不能凭这个数保证压住某个 CPU，也不直接跨品牌排名。环境温度、CPU 接触/热流密度、噪声和风扇转速等条件会改变结果。
- 没有可信型号级来源的数值保持 null/unknown。CQ125 目前只有评测来源，未取得足够的该版本官网规格，因此本轮不补推测值。

## 逐型号结果

“未确认”只表示本轮官方材料中没有明确证据，**不是**断言厂家完全没有公布过。下表“官方标称 W”来自官方 TDP 总表或型号页，详见后文；“规格来源”为热管/接口核对页。

| ID / 精确型号                                      | 热管        | 热管与鳍片连接   | 官方标称 W                       | 规格来源                                                                                                                                                      |
| -------------------------------------------------- | ----------- | ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ps120se` / Phantom Spirit 120 SE                  | 7 根 × 6 mm | 未确认           | 未提供统一 W                     | [官方规格](https://www.thermalright.com/product/phantom-spirit-120-se/)                                                                                       |
| `u12a` / NH-U12A                                   | 7 根 × 6 mm | 焊接，未细分制程 | 未提供统一 W；NSPR 169（不是 W） | [官方规格](https://www.noctua.at/en/products/nh-u12a/specifications)                                                                                          |
| `d15g2` / NH-D15 G2                                | 8 根 × 6 mm | 焊接，未细分制程 | 未提供统一 W；NSPR 228（不是 W） | [官方规格](https://www.noctua.at/en/products/nh-d15-g2/specifications)                                                                                        |
| `lf3360` / Liquid Freezer III 360                  | 不适用      | 不适用           | 未提供统一 W                     | [官方规格](https://www.arctic.de/en/Liquid-Freezer-III-360/ACFRE00136A)                                                                                       |
| `d15g2hbc` / NH-D15 G2 HBC                         | 8 根 × 6 mm | 焊接，未细分制程 | 未提供统一 W；NSPR 228（不是 W） | [官方规格](https://www.noctua.at/en/products/nh-d15-g2-hbc/specifications)                                                                                    |
| `hyper612` / Hyper 612 APEX                        | 6 根        | 未确认           | 260 W（TDP）                     | [官方规格](https://www.coolermaster.com/en-global/products/hyper-612-apex.html)                                                                               |
| `nl-lc136` / NL-LC1-36                             | 不适用      | 不适用           | 未提供统一 W；NSPR 248（不是 W） | [官方规格](https://www.noctua.at/en/products/nl-lc1-36/specifications)                                                                                        |
| `cq125` / CQ125（无光版）                          | 未确认      | 未确认           | 未提供统一 W                     | 未取得官网规格                                                                                                                                                |
| `v8ace-intel` / V8 ACE 3DHP（Intel 版）            | 6 根        | 未确认           | 300 W（TDP）                     | [官方规格](https://www.coolermaster.com/en-us/products/v8-ace-3dhp.html)                                                                                      |
| `cc90` / CC90 Black                                | 6 根 × 6 mm | 未确认           | 285 W（D-TDP）                   | [官方规格](https://www.jonsbo.com/products/CC90.html)                                                                                                         |
| `ak500s-digital` / AK500S DIGITAL（非 SE）         | 5 根 × 6 mm | 未确认           | 240 W（TDP）                     | [官方规格](https://global.deepcool.com/products/Cooling/cpuaircoolers/AK500S-DIGITAL-CPU-Cooler-With-Status-Display-1851-1700-AM5/2023/17235.shtml)           |
| `ak700-digital-nyx` / AK700 DIGITAL NYX            | 7 根 × 6 mm | 未确认           | 280 W（TDP）                     | [官方规格](https://www.deepcool.com/products/Cooling/cpuaircoolers/AK700-DIGITAL-NYX-AI-Dynamic-Adjustment-CPU-Cooler-with-Digital-Display/2025/21815.shtml)  |
| `ag500g2` / AG500 G2（无光版）                     | 5 根 × 6 mm | 未确认           | 250 W（TDP）                     | [官方规格](https://www.deepcool.com/products/Cooling/cpuaircoolers/AG500-G2-Superior-Performance-5-Heatpipe-Single-Tower-CPU-Cooler/2026/22855.shtml)         |
| `ps120evo` / Phantom Spirit 120 EVO                | 7 根 × 6 mm | 未确认           | 未提供统一 W                     | [官方规格](https://www.thermalright.com/product/phantom-spirit-120-evo/)                                                                                      |
| `pa120se` / Peerless Assassin 120 SE（原版）       | 6 根 × 6 mm | 未确认           | 未提供统一 W                     | [官方规格](https://www.thermalright.com/product/peerless-assassin-120-se/)                                                                                    |
| `freezer36black` / Freezer 36 Black                | 4 根 × 6 mm | 未确认           | 未提供统一 W                     | [官方规格](https://www.arctic.de/en/Freezer-36-Black/ACFRE00123A)                                                                                             |
| `hyper212pro` / Hyper 212 Pro（黑色 ARGB）         | 4 根        | 未确认           | 230 W（TDP）                     | [官方规格](https://www.coolermaster.com/en-global/products/hyper-212-pro.html)                                                                                |
| `ak620g2` / AK620 G2（木纹顶盖）                   | 6 根 × 6 mm | 未确认           | 300 W（TDP）                     | [官方规格](https://deepcool.com/products/Cooling/cpuaircoolers/AK620-G2-Wood-Grain-Top-Cover-CPU-Cooler/2025/21864.shtml)                                     |
| `assassiniv` / ASSASSIN IV（标准版）               | 7 根 × 6 mm | 未确认           | 280 W（TDP）                     | [官方规格](https://www.deepcool.com/products/Cooling/cpuaircoolers/Assassin-IV-Premium-CPU-Air-Cooler-1851-1700-AM5/2024/17129.shtml)                         |
| `lf3pro240` / Liquid Freezer III Pro 240（无光版） | 不适用      | 不适用           | 未提供统一 W                     | [官方规格](https://www.arctic.de/en/Liquid-Freezer-III-Pro-240/ACFRE00178A)                                                                                   |
| `lf3pro360` / Liquid Freezer III Pro 360（无光版） | 不适用      | 不适用           | 未提供统一 W                     | [官方规格](https://www.arctic.de/en/Liquid-Freezer-III-Pro-360/ACFRE00180A)                                                                                   |
| `ak400` / AK400（标准黑色版）                      | 4 根 × 6 mm | 未确认           | 220 W（TDP）                     | [官方规格](https://global.deepcool.com/products/Cooling/cpuaircoolers/AK400-Performance-CPU-Cooler-1851-1700-AM5/2024/15222.shtml)                            |
| `ak400digitalpro` / AK400 DIGITAL PRO（黑色）      | 4 根 × 6 mm | 未确认           | 220 W（TDP）                     | [官方规格](https://www.deepcool.com/products/Cooling/cpuaircoolers/AK400-Digital-Pro-Cooler-With-Multi-line-Display-1851-1700-AM5/2024/18680.shtml)           |
| `rk120` / Royal Knight 120（标准版）               | 6 根 × 6 mm | 未确认           | 未提供统一 W                     | [官方规格](https://www.thermalright.com/product/royal-knight-120/)                                                                                            |
| `pa140black` / Peerless Assassin 140 BLACK         | 6 根 × 6 mm | 未确认           | 未提供统一 W                     | [官方规格](https://www.thermalright.com/product/peerless-assassin-140-black/)                                                                                 |
| `u12sredux` / NH-U12S redux                        | 4 根 × 6 mm | 穿 Fin / 压合    | 未提供统一 W；NSPR 129（不是 W） | [官方规格](https://www.noctua.at/en/products/nh-u12s-redux/specifications)                                                                                    |
| `darkrockpro5` / Dark Rock Pro 5                   | 7 根 × 6 mm | 未确认           | 270 W（TDP）                     | [官方规格](https://www.bequiet.com/en/cpucooler/4466)                                                                                                         |
| `ls520sedigital` / LS520 SE DIGITAL（黑色）        | 不适用      | 不适用           | 280 W（TDP）                     | [官方规格](https://uk.deepcool.com/products/Cooling/cpuliquidcoolers/LS520-SE-DIGITAL-240mm-Liquid-Cooler-With-Status-Display-1851-1700-AM5/2024/17474.shtml) |
| `ls720sedigital` / LS720 SE DIGITAL（黑色）        | 不适用      | 不适用           | 300 W（TDP）                     | [官方规格](https://deepcool.com/products/Cooling/cpuliquidcoolers/LS720-SE-DIGITAL-360mm-Liquid-Cooler-With-Status-Display-1851-1700-AM5/2024/17234.shtml)    |

## 主要证据与避免误读

### Noctua

[NH-U12A 官方规格](https://www.noctua.at/en/products/nh-u12a/specifications)、[NH-D15 G2 官方规格](https://www.noctua.at/en/products/nh-d15-g2/specifications)、[NH-D15 G2 HBC 官方规格](https://www.noctua.at/en/products/nh-d15-g2-hbc/specifications) 的 Mechanical specifications 直接提供热管/鳍片接口字段，值均为 Soldered，并分别列 7、8、8 根 6 mm 热管。这些页面没有写具体回流焊工艺，网站须保持“焊接”。

[NH-U12S redux 官方规格](https://www.noctua.at/en/products/nh-u12s-redux/specifications) 同一字段为 Press-fit，4 根 6 mm 热管。不能把普通 U12S 或 U12A 的焊接套到 redux。

[Noctua 官方 NSPR 说明](https://noctua.at/es/noctua-standardised-performance-rating) 解释不公开 TDP 的原因及自有评级。当前型号页 NSPR：U12A 169、D15 G2/HBC 228、U12S redux 129；[NL-LC1-36 规格](https://www.noctua.at/en/products/nl-lc1-36/specifications) 为 248。这些是评级分数，不带 W 单位，不可转换成最大解热瓦数。

### DeepCool

[官方 TDP / CPU Socket Compatibility List](https://www.deepcool.com/ProductCompatibilityS_New/) 在 Model / TDP 列逐行列出精确型号：AK400 220 W、AK400 DIGITAL PRO 220 W、AK500S DIGITAL 240 W、AK700 DIGITAL NYX 280 W、AG500 G2 250 W、AK620 G2 300 W、ASSASSIN IV 280 W、LS520 SE DIGITAL 280 W、LS720 SE DIGITAL 300 W。本轮通过官网 HTML 和浏览检索交叉读取。不要把 AK620 原版的 260 W 套到 G2，也不要用非 SE / 非 DIGITAL 替代已收录的水冷型号。

对应型号页 Technical Spec 直接列 Heatpipe：AK400 与 DIGITAL PRO 4×6 mm、AK500S DIGITAL 5×6 mm、AK700 DIGITAL NYX 7×6 mm、AG500 G2 5×6 mm、AK620 G2 6×6 mm、ASSASSIN IV 7×6 mm。

AK400、AK400 DIGITAL PRO、AK500S DIGITAL、AG500 G2 官方正文明确直触底座；AK620 G2、AK700 DIGITAL NYX 明确铜底。这些都不足以说明热管/鳍片接口是焊接还是穿 Fin，因此接口字段保留 unknown。

### Cooler Master

[官方 CPU Compatibility 总表](https://www.coolermaster.com/en-global/cpu-compatibility.html) 的 Air Coolers / TDP 列明确 Hyper 612 APEX 260、Hyper 212 Pro 230、V8 Ace 3DHP 300。V8 这一行是产品家族标称，官网另有 Intel/AMD 独立结构说明；必须保留 Intel 版本，不挪用 AMD 版的实测排名。

[Hyper 612 APEX](https://www.coolermaster.com/en-global/products/hyper-612-apex.html) 明确 6 根 SCHP；[Hyper 212 Pro](https://www.coolermaster.com/en-global/products/hyper-212-pro.html) 的 RR-212S-25PZ-R1 对应 4 根热管、直触底座、ARGB。两款没有找到热管/鳍片连接方式的明确官方文字。

[V8 ACE 3DHP 官方页面](https://www.coolermaster.com/en-us/products/v8-ace-3dhp.html) 明确 2 根 3DHP + 4 根 SCCHP，共 6 根。其 Intel 技术说明的 90 W Q-Max 是热管传热容量，**不是 CPU 功耗，也不是这款散热器整机最大解热功耗**。页面没有明确热管/鳍片连接方式。

### Thermalright

五个精确型号官网规格确认：PS120 SE / EVO 各 7 根 6 mm，PA120 SE / Royal Knight 120 / PA140 BLACK 各 6 根 6 mm。五页均明确铜底材料，但本轮可读正文未声明热管/鳍片接口，也未找到整机 TDP W。第三方媒体称 RK120 鳍片穿 Fin、铜底回流焊，但本轮只接收官方主来源，因此没有把该说法写入已确认接口。

### Jonsbo / be quiet! / ARCTIC

[CC90 Black 官方规格](https://www.jonsbo.com/products/CC90.html) 明确 6 根 6 mm、D-TDP 285 W、CNC 精工微雕底座描述（未在可读文字确认材质）；仍没有明确鳍片连接工艺。

[Dark Rock Pro 5 BK036 官方规格](https://www.bequiet.com/en/cpucooler/4466) General data 列 TDP 270 W，Heatsink specifications 列 7 根 6 mm 热管和铜底。没有找到鳍片接口工艺的明确说明。

[Freezer 36 Black](https://www.arctic.de/en/Freezer-36-Black/ACFRE00123A) 明确 4 根 6 mm 铜热管。官网关于热管“焊接端头”的句子仅指被顶盖遮住的端头，**不能证明热管与鳍片焊接**，接口仍 unknown。[ARCTIC 官方 FAQ](https://www.arctic.de/en/faq/detail/why-doesn-t-arctic-specify-tdp-values) 明确说明不提供散热器 TDP 值；Freezer 36 与收录的 Liquid Freezer III 360、Pro 240、Pro 360 都保留 null，而不按风扇/水泵电功耗、冷排尺寸估算。

## 可合并的数据

`research/construction-data.json` 为逐 ID 数据；每项包含独立来源、日期、热管数量、鳍片接口、底座接触方案和厂商标称功耗。它没有修改 catalog 或推荐引擎。未知信息不能参与“通过兼容性”或宣称某瓦数必然压制的判断。
