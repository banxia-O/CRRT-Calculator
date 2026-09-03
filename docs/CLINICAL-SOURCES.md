# CRRT Calculator 临床公式来源登记

最后核对：2026-09-03

本文件用于记录 V1 主流程中已经实际进入计算器的医学公式、范围及其来源状态。后续如指南更新，应先更新本表，再修改公式与测试。

## 1. CRRT 处方液与治疗剂量

**来源**：《中国连续肾脏替代治疗处方液体应用临床实践指南（2026版）》  
制定者：中国医疗保健国际交流促进会重症医学分会、中国重症血液净化协作组  
期刊：中华医学杂志，2026，106(15):1409-1424  
DOI：`10.3760/cma.j.cn112137-20260108-00083`  
状态：**正式发布**（2026-04-21）

当前用于：

- CRRT 处方液 / 透析液 / 置换液相关原则
- CVVH、CVVHD、CVVHDF 处方逻辑
- 高钾血症时处方液钾浓度 `0–2 mmol/L` 的范围提示
- RCA 时滤器后 iCa 初始目标及高风险患者目标范围

## 2. RCA（Regional Citrate Anticoagulation，局部枸橼酸抗凝）

**来源**：Liu SY, Xu SY, Yin L, et al. *Management of regional citrate anticoagulation for continuous renal replacement therapy: guideline recommendations from Chinese emergency medical doctor consensus*. Military Medical Research. 2023;10:23.  
DOI：`10.1186/s40779-023-00457-9`  
状态：**正式发布**（2023-05-29）

当前用于：

- 枸橼酸初始剂量按血流量设置的原则
- 4% 枸橼酸钠初始泵速换算
- 无钙处方液时 10% 葡萄糖酸钙初始速度换算
- 体内 iCa 监测与动态调整提示
- RCA 酸碱负荷相关提示

## 3. 普通肝素

**当前默认来源**：《抗凝技术在危重症肾脏替代治疗应用的中国专家共识（2023年版）》  
期刊：中华肾脏病杂志，2023，39(2):155-164  
DOI：`10.3760/cma.j.cn441217-20220809-00815`  
状态：**正式发布**

当前用于：

- 普通肝素首剂 `5–15 IU/kg`
- 维持 `5–10 IU/kg/h`
- APTT / 抗 Xa 监测范围

### 已知权威文件冲突

《连续性肾脏替代治疗的抗凝管理指南》（中华医学会肾脏病学分会，2022）给出的普通肝素首剂为 `30–40 IU/kg`，维持同样为 `5–10 IU/kg/h`。  
DOI：`10.3760/cma.j.cn441217-20220620-00149`。

因此：

- 当前程序按发布时间更新优先，采用 2023 共识首剂范围。
- **正式科室上线前，普通肝素首剂必须由 ICU / 肾脏相关负责人确认本院采用哪套方案。**
- 在该项完成科室确认前，本项目应视为临床试用 / 核对工具，不应把该首剂范围视为院内固定医嘱模板。

## 4. KDIGO 2026 AKI / AKD

KDIGO 2026 Clinical Practice Guideline for Acute Kidney Injury (AKI) and Acute Kidney Disease (AKD) 截至 2026-09-03，KDIGO 官网仍将其列为 **Public Review Draft**，工作组正在根据公开评审反馈准备正式发表。

因此：

- 可用于最新证据背景核对。
- **不作为本项目任何公式的唯一正式依据。**
- 正式版发布后应重新核对 CRRT 剂量、模式、抗凝等相关条目。

## 5. 纯数学 / 化学换算

以下属于单位或浓度换算，本身不构成治疗推荐：

- `10% KCl ≈ 1.341 mmol/mL`
- `15% KCl ≈ 2.012 mmol/mL`
- `1.4% NaHCO₃ ≈ 0.1667 mmol/mL`
- `5% NaHCO₃ ≈ 0.5952 mmol/mL`
- `8.4% NaHCO₃ ≈ 1.0 mmol/mL`

治疗目标浓度仍由临床医生依据实时血气、电解质及具体处方液设定。

## 6. 更新规则

每次临床公式更新至少完成：

1. 核对正式来源及发布日期；
2. 在本文件记录旧值、新值及来源；
3. 修改 `src/calculators/` 或 `src/validation/`；
4. 更新对应自动测试；
5. 执行 `npm test`；
6. 执行 `npm run build`；
7. 双击 `dist/index.html` 完成离线回归测试；
8. 涉及院内用药方案时，由对应科室负责人再次确认。
