# CRRT Calculator

CRRT / CBP 处方计算器，当前完成到 Phase 2。

## 当前已实现

- Stepper 分步流程
- 配置驱动字段与动态分支
- 每个选择模块保留“其他”自由输入
- 体重 × 目标治疗剂量 → 目标总流出液量
- 净超滤单独显示
- CVVH / CVVHD 自动拆分置换液或透析液
- CVVHDF 支持 1:1 或自定义比例拆分
- 前稀释 / 后稀释记录
- 实时计算结果
- PC / 手机响应式布局
- 构建后输出单个离线 HTML 文件

> 当前仅完成液体量计算主流程。抗凝、电解质和缓冲液计算将在后续 Phase 接入。

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
- `src/clinical/options.ts`：常用选项
- `src/flow/engine.ts`：通用分支规则解释器
- `src/calculators/fluid.ts`：Phase 2 液体量计算
- `docs/PHASE2-FLUID-CALCULATION.md`：公式边界与医学依据
- 后续 `src/calculators/anticoagulation.ts`：抗凝计算
- 后续 `src/validation/`：临床校验和提示

开发源码保持模块化，最终构建为单个 HTML；这样后续改医学内容时不需要把所有代码手工维护在一大坨文件里。
