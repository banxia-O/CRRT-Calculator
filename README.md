# CRRT Calculator

CRRT / CBP 处方参数计算器，当前主流程完成，进入 **v1.0.0-rc.1**。

> 当前定位：离线处方参数换算 + 防呆校验工具。正式科室使用前仍需完成本科室临床负责人核对，尤其是普通肝素首剂方案。

## V1 已实现

- Stepper：基础信息 → 治疗设置 → 抗凝 → 电解质 / 缓冲液 → 结果
- 配置驱动字段与动态分支
- 每个选择模块保留“其他”自由输入
- 数字框直接键盘输入，隐藏浏览器上下微调箭头
- 体重 × 目标治疗剂量 → 目标总流出液量
- 净超滤单独显示
- CVVH / CVVHD 自动拆分置换液或透析液
- CVVHDF 支持 1:1 或自定义比例
- 前 / 后稀释记录
- 4% 枸橼酸钠初始泵速换算
- 普通肝素首剂 / 维持剂量范围与泵速换算
- RCA 无钙方案 10% 葡萄糖酸钙初始速度换算
- NaHCO₃ 配液 / 泵速换算
- KCl 配液量换算
- 高钾血症处方液钾浓度范围提醒
- Error / Warning / Info 临床校验层
- 明显错误结果阻止生成正式可复制摘要
- 最终结果页 + 一键复制纯文本摘要
- `file://` 离线复制兼容回退
- PC / 手机响应式布局
- 构建后输出单个离线 HTML 文件

## 本地运行

首次或依赖更新后：

```bash
npm install
```

开发预览：

```bash
npm run dev
```

浏览器打开终端显示的本地地址，通常为：

```text
http://localhost:5173/
```

## 测试

```bash
npm test
```

## 生成医院离线版

```bash
npm run build
```

构建成功后，交付文件为：

```text
dist/index.html
```

该文件已内联页面、样式和 JavaScript。复制到 U 盘后，可带入医院内网电脑直接双击打开；目标电脑不需要安装 Node.js、npm，也不需要互联网。

建议交付时重命名保留版本号，例如：

```text
CRRT-Calculator-v1.0-rc1.html
```

## 临床来源与发布检查

- `docs/CLINICAL-SOURCES.md`：正式指南 / 共识、DOI、来源状态、已知冲突和更新规则
- `docs/RELEASE-CHECKLIST.md`：离线构建、主流程回归、科室上线前检查清单

当前关键来源包括：

1. 《中国连续肾脏替代治疗处方液体应用临床实践指南（2026版）》
2. 2023 中国急诊医师 RCA 管理指南 / 共识
3. 《抗凝技术在危重症肾脏替代治疗应用的中国专家共识（2023年版）》
4. 《连续性肾脏替代治疗的抗凝管理指南》（2022）用于抗凝方案交叉核对

KDIGO 2026 AKI / AKD 截至 2026-09-03 仍为 Public Review Draft，只作补充核对，不作为任何公式的唯一正式依据。

## 已知待确认项

普通肝素首剂在两份国内权威文件中存在差异：

- 2023 共识：`5–15 IU/kg`
- 2022 CRRT 抗凝管理指南：`30–40 IU/kg`

当前程序采用 2023 共识。正式科室上线前必须由 ICU / 肾脏相关负责人确认最终院内方案。

## 架构

- `src/clinical/config.ts`：字段和显示条件
- `src/clinical/options.ts`：常用选项和制剂规格元数据
- `src/flow/engine.ts`：通用分支规则解释器
- `src/calculators/fluid.ts`：液体量计算
- `src/calculators/anticoagulation.ts`：枸橼酸 / 普通肝素计算
- `src/calculators/electrolytes.ts`：钙 / NaHCO₃ / KCl
- `src/validation/prescription.ts`：临床校验规则
- `src/output/prescription.ts`：最终处方摘要生成
- `docs/PHASE2-FLUID-CALCULATION.md` ～ `docs/PHASE6-RESULTS.md`：各阶段设计与医学边界

开发源码保持模块化，正式交付保持单个 HTML；后续更新公式或选项时不需要破坏页面基础架构。
