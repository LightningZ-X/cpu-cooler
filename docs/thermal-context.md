# CPU 工况、体质与导热介质

核查日期：2026-11-16。以下是选型页面的处理依据，不提供超频电压设置，也不预测用户整机温度。

## 官方依据

- [Intel 温度排查说明](https://www.intel.com/content/www/us/en/support/articles/000059749/processors/intel-core-processors.html)：主板电压、LLC、功耗与超频会影响温度。网站因此区分主板默认、Intel 默认、限功耗、解除限制、手动超频、降压优化；不把默认解释为固定基础功耗。
- [Intel XTU 指南](https://www.intel.com/content/www/us/en/gaming/resources/overclocking-xtu-guide.html)：CPU、主板支持与稳定性测试需要核对。页面只记录用户现有工况，不宣称任意 CPU/主板支持超频，不提供一套通用电压。
- [Noctua 介质比较说明](https://www.noctua.at/en/expertise/tech/performance-comparison-nt-h1-vs-nt-h2)：效果取决于涂布、接触、压力和热负载。本站据此不把介质名称换算为固定降温或更高解热瓦数。
- [Thermal Grizzly Conductonaut 官方说明](https://www.thermal-grizzly.com/en/conductonaut/s-tg-c-005-r)：液金导电，不得接触铝；需确认实际接触面。网页为液金提供材料与绝缘核对提示，不因为使用液金而改变散热器机械兼容。

## 本站规则与边界

- 使用用户填入的同用途稳定负载 CPU Package Power，或限功耗设置，或官方最大睿频功耗作为选型负载参考，并明确显示来源。实测功耗不等于整机功耗、最高瞬时功耗或电压 VID。
- 200 W 仍为原有选型规则的分流点，不是散热器容量边界；大于该值的实测持续负载或生产力负载优先考察大规格。手动超频/解除限制保持保守考察；降压没有实测功耗时不自动减少规格。
- CPU 体质仅作为用户自述：同频同负载所需电压低/中/高或未知；不能由这一分类计算温差、扣除功耗、估计稳定电压，也不采信跨主板 SP 分数作统一标准。
- 硅脂、相变、液金、固态片、介质旧化和未安装分别提供说明。未安装/接触存疑需先处理再负载验证。开盖、裸晶和专用直触改装不在当前安装数据库覆盖范围。
- 默认与工况未知不会伪造实测值；缺失体质或介质保持未知。材料、体质不改变产品标称TDP、已有实测读数或机械安装结论。
- 更换 CPU 会清空实测功耗和体质；切换用途、运行工况或功耗限制会清空实测功耗，避免旧测量跨工况使用。应用横评条件也会清空旧测量。
- 超频/降压不沿用限功耗测试排名；用户实测功耗与测试组设置不同也不沿用。功耗相同仍仅为同组参考，体质、介质、接触、环境温度和机箱风道不完全相同，无法保证复现温度。
- 旧配置和分享链接可兼容，新增字段默认未知；新增字段参与归一化和同源保存/分享。越界功耗不会静默用于计算，表单保留上次有效建议并显示错误。

## AMD AM5 温控与积热

- CPU 规格页提供标称 TDP、封装组成和 Tjmax。Ryzen 7 7800X3D 为 89 °C，9800X3D 为 95 °C。Tjmax 是该型号工作的温度上限，日常温度随负载变化。实测温度与上限的差值仅供解读。排查时同时看有效频率、持续封装功耗、风扇转速和接触情况。 [7800X3D 规格](https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html) · [9800X3D 规格](https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9800x3d.html) · [AMD 温度与动态加速说明](https://community.amd.com/t5/gaming/ryzen-7000-series-processors-let-s-talk-about-power-temperature/ba-p/554629)
- AMD 选型参考按实测持续封装功耗、用户设置的 PPT、库内默认档参考值的顺序取值。主板 BIOS 中的 PPT、TDC、EDC 和温度限制决定实际配置。参考 PPT 采用常见档位，具体设置以 BIOS 或监测为准。9950X3D2 的默认 PPT 暂留待核对，持续生产力按 AMD 指定的水冷考察方向提示。 [AMD Ryzen Master](https://docs.amd.com/r/en-US/68886-ryzen-master-user-guide/CPU) · [9950X3D2 规格](https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-9-9950x3d2-dual-edition.html)
- 单 CCD、双 CCD 与单片 APU 分别提示。散热器卡片标记厂商明确的 AM5 底座和偏移方案，区分可选扣具与原厂偏移安装。偏移后需要复核第一 PCIe 插槽、M.2、VRM 和机箱边缘净空。偏移标签不换算固定温差。厂商明确不推荐用于 AM5 的底座版本会降低推荐优先级，物理扣具兼容独立判断。 [Noctua 偏移技术说明](https://www.noctua.at/en/expertise/tech/offset-am5-mounting-technical-backgrounds) · [Noctua 扣条型号表](https://www.noctua.at/en/support/faqs/which-offset-mounting-bars-do-i-need-for-my-cooler) · [NH-D15 G2 HBC 规格](https://www.noctua.at/en/products/nh-d15-g2-hbc/specifications)
