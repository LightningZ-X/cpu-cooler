# 独立评测与未参加横评型号的官方规格核对

核对日期：2026-11-14。本笔记只核实安装规格，不从厂商宣传的 TDP、热管数量或代际提升推导实际温度。是否属于 51972 某期评测样品、是否有可录入的实测结果，需另与原视频逐型号对应。这里的“补充型号”不代表全部在 2026 年上市。

## 可以补入安装筛选的四款

| 精确型号 | Intel 扣具支持 | 官方产品外形（长×宽×高，mm） | 内存资料及处理 | 来源 |
| --- | --- | --- | --- | --- |
| JONSBO CC90 Black（黑色） | LGA1851 / LGA1700 | 135×130×158 | 页面未给出可用的内存净空数值；保持未知，不能默认全兼容，也不能从产品高度猜风扇抬升量 | [乔思伯 CC90 黑色](https://www.jonsbo.com/products/CC90.html) |
| DeepCool AK500S DIGITAL（黑色，非 SE） | LGA1851 / LGA1700 | 125×96×160 | 官方描述偏置热管为高内存及内存插槽留空间，但未提供具体 mm 净空；可记录官方避让说明，不宜据此保证特殊主板/超高内存无冲突 | [九州风神 AK500S DIGITAL](https://global.deepcool.com/products/Cooling/cpuaircoolers/AK500S-DIGITAL-CPU-Cooler-With-Status-Display-1851-1700-AM5/2023/17235.shtml) |
| DeepCool AK700 DIGITAL NYX（黑色） | LGA1851 / LGA1700 | 126×98×157 | 官方同样说明偏置热管与内存避让；没有数值净空，主板 VRM 等冲突仍待具体型号核实 | [九州风神 AK700 DIGITAL NYX](https://www.deepcool.com/products/Cooling/cpuaircoolers/AK700-DIGITAL-NYX-AI-Dynamic-Adjustment-CPU-Cooler-with-Digital-Display/2025/21815.shtml) |
| DeepCool AG500 G2（无 ARGB 版本） | LGA1851 / LGA1700 | 125×95×156 | 官方文字规格未给出数值内存净空，也未给出逐主板兼容表；保持未知 | [九州风神 AG500 G2](https://www.deepcool.com/products/Cooling/cpuaircoolers/AG500-G2-Superior-Performance-5-Heatpipe-Single-Tower-CPU-Cooler/2026/22855.shtml) |

表中的高度采用整机 `Product Dimensions` / 散热器尺寸，不使用更矮的裸鳍片 `Heatsink Dimensions`。例如 AK500S DIGITAL 的裸鳍片高度是 155 mm，整机应使用 160 mm；AK700 DIGITAL NYX 则分别为 151 mm 与 157 mm。[AK500S DIGITAL 官方规格](https://global.deepcool.com/products/Cooling/cpuaircoolers/AK500S-DIGITAL-CPU-Cooler-With-Status-Display-1851-1700-AM5/2023/17235.shtml)、[AK700 DIGITAL NYX 官方规格](https://www.deepcool.com/products/Cooling/cpuaircoolers/AK700-DIGITAL-NYX-AI-Dynamic-Adjustment-CPU-Cooler-with-Digital-Display/2025/21815.shtml)

### 型号标识与变体边界

- CC90 本次核对的是 `CC90 Black`。官方页面列出 130 mm 与 120 mm 两颗 PWM 风扇，屏显版；白色应独立核对，不将包装“单个体积”误当散热器尺寸。[官方页](https://www.jonsbo.com/products/CC90.html)
- AK500S DIGITAL 黑色料号为 `R-AK500S-BKADMN-G`，不是 AK500 DIGITAL、AK500S DIGITAL SE 或 AK500 G2 DIGITAL NYX。屏显及灯光接口含主板 USB 2.0 与 5 V ARGB；风扇另为 4-pin PWM。[官方页](https://global.deepcool.com/products/Cooling/cpuaircoolers/AK500S-DIGITAL-CPU-Cooler-With-Status-Display-1851-1700-AM5/2023/17235.shtml)
- AK700 DIGITAL NYX 料号为 `R-AK700-BKNNMN-GJD-1`；屏显需空闲 USB 2.0 接针与软件，风扇为 4-pin PWM。它不是 AK700 VC、AK700 普通版或 AK620 G2 DIGITAL NYX。[官方页](https://www.deepcool.com/products/Cooling/cpuaircoolers/AK700-DIGITAL-NYX-AI-Dynamic-Adjustment-CPU-Cooler-with-Digital-Display/2025/21815.shtml)
- AG500 G2 无光版料号为 `R-AG500-BKNPMG2-G`。ARGB 版虽然官方尺寸同为 125×95×156 mm，料号却是 `R-AG500-BKAMMG2-G`，风扇参数也不同，不能把一种风扇的实测映射给另一种。[无光版](https://www.deepcool.com/products/Cooling/cpuaircoolers/AG500-G2-Superior-Performance-5-Heatpipe-Single-Tower-CPU-Cooler/2026/22855.shtml)、[ARGB 版](https://www.deepcool.com/products/Cooling/cpuaircoolers/AG500-G2-ARGB-Superior-Performance-5-Heatpipe-Single-Tower-CPU-Cooler/2026/22909.shtml)

## Hyper 612 PRO：已确认存在，整机尺寸仍缺官方证据

中国官方产品名称为 **HYPER 612 APEX PRO**。页面列出第三代复合热管、Mobius 120U 风扇、金属磁吸顶盖与内存避让；官方长图写明原生支持 Intel LGA1851/1700。因此用户/评测里的“Hyper 612 PRO”应先对应到这个明确变体，而不能沿用仓库现有 Hyper 612 APEX 的测试结果。[酷冷至尊中国官方页](https://www.coolermaster.com.cn/product_detail/401.html)、[该页面链接的官方产品说明长图](https://qiniu.daorankeji.cn/image/mns9un5k_6lgty762z4qr69d85cc3d3f80.jpg)

此次访问官方页的“产品规格”区域为空、页面显示“暂无数据”；长图没有可核实的整机高度和数字化内存净空。因此**尚不能把旧 APEX 的 159 mm 自动填给 PRO**。处理建议：独立评测来源库可收录；产品选型库要么暂不纳入，要么明确高度未知并阻止生成“机箱高度通过”的判断。ARGB、白色、黑色等版本也须精确对上后再关联实测。[官方产品页](https://www.coolermaster.com.cn/product_detail/401.html)

## 数据使用边界

这些官方页没有提供本项目所需的逐主板实装冲突证据。LGA1851/1700 扣具支持仅能确认插槽层面，不能替代 VRM、M.2 装甲、显卡背板、风扇与内存的实际空间核对。未知主板记录应继续显示“待确认”。以上型号在没有精确对应的原始测试读数前，只能显示“官方规格已核对 / 实测待补”，不得继承其它同系列型号的旧成绩。

## 用户指定 CQ125 与 V8 ACE

[51972 原始新品速览](https://www.bilibili.com/video/BV1M9KB6GE9D/?t=100)约 01:40 图表：270K Plus、功耗约 280W、室温 24℃±0.2、全速，V8 ACE 92℃/2553RPM，CQ125 94℃/2366RPM。仅录入这两条，平均/峰值、硅脂、完整 BIOS 与机箱条件仍未知；280W 不是 CPU 官方默认功耗。

[V8 ACE 官方页](https://www.coolermaster.com/en-us/products/v8-ace-3dhp.html)明确区分 Intel/AMD 底座和热管，Intel 支持 1851/1700，内存净空 45mm。规格表高度167.3mm，但概览及 [Cybenetics Intel 样品](https://www.cybenetics.com/evaluations/coolers/126/cn/)写168mm，筛选保守用168mm。不能外推滑轨超出45mm后的可用量。

[瓦尔基里官方公开目录](https://www.valkyrie.com.cn/)当前未提供CQ125说明书。未采用二手网站尺寸作确定安装判断；CQ125高度与内存净空为空，仅从51972实际Intel测试确认LGA1851。LGA1700扣具未知，不用同系列推断。新增产品的source可以是一手评测而非官网，界面须区分来源。
