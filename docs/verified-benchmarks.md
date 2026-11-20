# Intel 与 AMD AM5 横评读数与应用范围

核对日期：2026-11-14；2026-11-20 补充 AMD AM5 实测组。数值来自原作者图表或原始评测正文，不来自评论或二次“省流”。总计收录 37 条温度/温差读数（51972 共 21 条、GamersNexus 共 16 条）。温度、转速与同噪目标分开保存，不把多个量重复算成多个样本。

## 51972 风冷

直接打开 [2025风冷横评](https://www.bilibili.com/video/BV1yCSPBVEg1/) 播放画面核对三张 Intel 图表，每张整理三项可辨认结果：

- [06:33 附近](https://www.bilibili.com/video/BV1yCSPBVEg1/?t=393)：14900K、240W、原装风扇全速、统一硅脂。Hyper 612 APEX 双风扇与 NH-U12A 双风扇均为 90℃；VK R125-L 单风扇为 91℃。
- [11:40 附近](https://www.bilibili.com/video/BV1yCSPBVEg1/?t=700)：265K、250W。Hyper 612 APEX 为 85℃；NH-U12A 双风扇与 VK R125-L 为 91℃。
- [20:23](https://www.bilibili.com/video/BV1yCSPBVEg1/?t=1223)：14900K、260W 双塔组。酷里奥 P60T V3 ULTRA 为 89℃；VK DX140、NH-D15 G2 标准版为 91℃。

以上保留图表原始温度、风扇版本与转速；室温和温度平均/峰值统计口径尚未核实，页面明确说明。240W 单塔与 260W 双塔不能混排，全速也不能当作同噪。

## 51972 水冷

直接核对 [2026水冷横评约 06:15 的同噪图表](https://www.bilibili.com/video/BV1C54E6fEPD/?t=375)。图中条件为 Ultra 7 270K Plus、310W、单烤 FPU、统一 38.4 dB(A)、室温 24±0.2℃。整理图表中的十项温度和转速，详见 `data/reviews/benchmarks.json`。

此组的 310W 超过该 CPU [官方 250W 最大睿频功耗](https://www.intel.com/content/www/us/en/products/sku/245692/intel-core-ultra-7-processor-270k-plus-36m-cache-up-to-5-50-ghz/specifications.html)，不能把它标为默认功耗。图中温度是绝对值；噪声测量距离、温度统计口径及完整 BIOS 仍需继续核对。

## 跨风冷 / 水冷的同组对比

采用 [GamersNexus 的原始 D15 G2 评测](https://gamersnexus.net/coolers/noctua-nh-d15-g2-review-benchmarks-hbc-lbc-comparison-best-cpu-coolers) 中 Intel 250W、25 dB(A) 同噪章节：14900KF 平台、1 米半消声室测量，Liquid Freezer III 360 为 48.1℃ P 核温差，NH-D15 G2 HBC 为 57.8℃ P 核温差。二者都是相对室温的温差，不能和 51972 的绝对温度直接比较，也不能把 HBC 数据给标准版。

## AMD AM5 同噪实测对比（GamersNexus Mega Charts）

核对日期：2026-11-20（直接核验 [GamersNexus CPU Cooler Mega Charts](https://gamersnexus.net/megacharts/cpu-coolers) 官方图表，图表更新时间 2026-08-04）：

- **Ryzen 7 9800X3D · 157W · 25 dB(A) 同噪（8 条读数，`gn-9800x3d-157-25dba`）**：MSI X670E ACE、固定 5.3 GHz / 1.255V VDDCR_VDD / 1.205V VSOC，稳态约 157W；半消声室 1 米距离、室温 21℃，记录 Tdie 相对室温平均温差（`delta-tdie`）。精确关联 `lf3360`（54.7℃）、`lf3pro360`（56.8℃）、`d15g2lbc`（61.0℃）、`darkrockpro5`（62.9℃）、`freezer36black`（64.8℃）。图中的 `Peerless Assassin 120`（非 SE 版）与 `Frozen Prism 360`（非 240 版）与库内型号版本不同，保持 `coolerId: null`，严禁跨版本继承。
- **Ryzen 9 9950X3D · 276W · 25 dB(A) 同噪（6 条读数，`gn-9950x3d-276-25dba`）**：MSI X670E ACE、固定 5.3 GHz / 1.165V VDDCR_VDD / 1.205V VSOC，双 CCD 稳态约 276W（高于默认 230W PPT）；同消声室 25 dB(A)、室温 21℃，记录 `delta-tdie`。精确关联 `lf3360`（60.4℃）、`lf3pro360`（66.4℃）、`d15g2lbc`（69.4℃）。

以上 AM5 读数采用定频定压下的 Tdie 平均温差，仅在同组同条件下作相对比较，不与 Intel 组 `delta-pcore` 或 51972 绝对温度混排，也不用于预测默认 PBO 或游戏温度。

## 进入建议的条件

选型页允许用户主动选择测试组，并应用其 CPU 与设置功耗。只有 CPU 完整型号、设置功耗与持续生产力用途对应时，才参考该组已参测且规格入库的型号；未参测产品继续按选型规则处理，不宣称更差。静音偏好排除全速组，价格偏好保留报价排序。

安装冲突优先于性能。已知冲突产品不因低温度获得优先推荐。未核实安装尺寸的参测产品只出现在图表，不能直接成为可安装候选。本轮未完成全部往期视频、所有参赛型号及修订内容的审计。
