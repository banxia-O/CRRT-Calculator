# CRRT Calculator

CRRT / CBP 处方计算器，当前完成到 Phase 4。

## 当前已实现

- Stepper 分步流程
- 配置驱动字段与动态分支
- 每个选择模块保留“其他”自由输入
- 体重 × 目标治疗剂量 → 目标总流出液量
- 净超滤单独显示
- CVVH / CVVHD 自动拆分置换液或透析液
- CVVHDF 支持 1:1 或自定义比例拆分
- 前稀释 / 后稀释记录
- 4% 枸橼酸钠初始泵速换算
- 普通肝素首剂 / 维持剂量范围与泵速换算
- RCA 无钙方案 10% 葡萄糖酸钙初始速度换算
- 含钙处方液特定模式的葡萄糖酸钙初始经验值提示
- NaHCO₃：基础液浓度 + 目标浓度 + 基础液流量 → 补碱泵速
- KCl：基础液钾浓度 + 目标钾浓度 + 袋体积 → KCl mL/袋
- 高钾血症时按 2026 版指南检查目标处方液钾浓度 0–2 mmol/L
- 实时计算结果
- PC / 手机响应式布局
- 构建后输出单个离线 HTML 文件

> 当前已覆盖液体量、常用抗凝、葡萄糖酸钙、NaHCO₃ 和 KCl 的主流程。目标浓度仍由临床医生根据实时病情设定，计算器负责公式换算和范围提示。

## 本地运行

第一次或依赖更新后：

```bash
npm install
```

启动开发版：

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

构建成功后，正式交付文件为：

```text
dist/index.html
```

这个 HTML 内联页面、样式和 JavaScript。复制到 U 盘后，可带入医院内网电脑直接双击打开；医院电脑不需要安装 Node.js、npm，也不需要互联网。

## 架构

- `src/clinical/config.ts`：字段和显示条件
- `src/clinical/options.ts`：常用选项和制剂规格元数据
- `src/flow/engine.ts`：通用分支规则解释器
- `src/calculators/fluid.ts`：Phase 2 液体量计算
- `src/calculators/anticoagulation.ts`：Phase 3 枸橼酸 / 普通肝素计算
- `src/calculators/electrolytes.ts`：Phase 4 钙 / NaHCO₃ / KCl
- `docs/PHASE2-FLUID-CALCULATION.md`：液体公式边界与医学依据
- `docs/PHASE3-ANTICOAGULATION.md`：抗凝公式、边界与来源
- `docs/PHASE4-ELECTROLYTES-BUFFER.md`：电解质与缓冲液公式、边界与来源
- 后续 `src/validation/`：Phase 5 临床校验和提示

开发源码保持模块化，最终构建为单个 HTML；这样后续改医学内容时不需要把所有代码手工维护在一大坨文件里。
