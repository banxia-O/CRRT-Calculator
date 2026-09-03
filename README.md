# CRRT Calculator

CRRT / CBP 处方计算器 Demo。

当前阶段只验证：

- Stepper 分步流程
- 配置驱动字段
- 动态显示分支
- 每个选择模块保留“其他”自由输入
- 实时处方摘要
- PC / 手机响应式布局

> 当前医学选项和数值仅用于 Demo 占位，尚未完成循证核对，不用于临床决策。

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 架构原则

- `src/clinical/config.ts`：字段、常用选项和显示条件
- `src/flow/engine.ts`：通用分支规则解释器
- 后续新增 `src/calculators/`：计算公式
- 后续新增 `src/validation/`：临床校验和提示

新增常用选项和大多数分支时优先修改配置，不改页面骨架。
