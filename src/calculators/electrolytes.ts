export type ComponentCalculationStatus =
  | 'idle'
  | 'ready'
  | 'incomplete'
  | 'unsupported'
  | 'invalid'

export type ComponentCalculationRow = {
  label: string
  value: string
}

export type ComponentCalculationResult = {
  status: ComponentCalculationStatus
  title: string
  rows: ComponentCalculationRow[]
  messages: string[]
}

export type ElectrolyteCalculationInput = {
  anticoagulationMethod?: string
  mode?: string
  replacementPosition?: string
  targetEffluentMlH?: number

  calciumFluidType?: string
  calciumGluconatePreparation?: string

  bicarbonatePreparation?: string
  bicarbonateCustomMmolMl?: number
  bicarbonateBaseMmolL?: number
  bicarbonateTargetMmolL?: number
  bicarbonateCarrierFlowMlH?: number

  potassiumContext?: string
  potassiumChloridePreparation?: string
  potassiumCustomMmolMl?: number
  potassiumBaseMmolL?: number
  potassiumTargetMmolL?: number
  potassiumBagVolumeL?: number
}

export type ElectrolyteCalculationResult = {
  calcium: ComponentCalculationResult
  bicarbonate: ComponentCalculationResult
  potassium: ComponentCalculationResult
}

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const idle = (title: string): ComponentCalculationResult => ({
  status: 'idle',
  title,
  rows: [],
  messages: [],
})

function calculateCalcium(
  input: ElectrolyteCalculationInput,
): ComponentCalculationResult {
  const title = '葡萄糖酸钙'

  if (input.anticoagulationMethod !== 'citrate') {
    return idle(title)
  }

  if (!input.calciumFluidType) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请选择 RCA 时置换液 / 透析液的含钙情况。'],
    }
  }

  if (!input.calciumGluconatePreparation) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请选择补钙制剂。'],
    }
  }

  if (input.calciumGluconatePreparation !== 'calcium_gluconate_10pct') {
    return {
      status: 'unsupported',
      title,
      rows: [],
      messages: ['Phase 4 只对 10% 葡萄糖酸钙套用指南中的初始经验公式；其他制剂先保留自由输入。'],
    }
  }

  if (input.calciumFluidType === 'calcium_free') {
    if (!input.targetEffluentMlH || input.targetEffluentMlH <= 0) {
      return {
        status: 'incomplete',
        title,
        rows: [],
        messages: ['需要先得到目标总流出液量，才能按无钙处方液方案计算初始补钙速度。'],
      }
    }

    const calciumRateMlH = input.targetEffluentMlH / 125
    const elementalCalciumMmolH = calciumRateMlH * 0.224

    return {
      status: 'ready',
      title,
      rows: [
        {
          label: '10% 葡萄糖酸钙初始速度',
          value: `${round(calciumRateMlH, 1)} mL/h`,
        },
        {
          label: '约含元素钙',
          value: `${round(elementalCalciumMmolH, 2)} mmol/h`,
        },
        { label: '体内 iCa 目标', value: '0.9–1.1 mmol/L' },
      ],
      messages: [
        '无钙置换液 / 透析液时，2023 中国急诊医师 RCA 指南建议 10% 葡萄糖酸钙初始速度 = 流出液速度 ÷ 125。',
        '该值只用于初始设置，后续必须根据体内离子钙动态调整。',
      ],
    }
  }

  if (input.calciumFluidType === 'calcium_containing') {
    const coveredMode =
      input.mode === 'cvvhd' ||
      (input.mode === 'cvvh' && input.replacementPosition === 'pre')

    if (!coveredMode) {
      return {
        status: 'unsupported',
        title,
        rows: [{ label: '体内 iCa 目标', value: '0.9–1.1 mmol/L' }],
        messages: [
          '含钙处方液的 8 mL/h 初始经验值，仅在 2023 RCA 指南明确覆盖的前稀释 CVVH 或 CVVHD 情景下自动给出；当前模式请人工设定并按 iCa 调整。',
        ],
      }
    }

    return {
      status: 'ready',
      title,
      rows: [
        { label: '10% 葡萄糖酸钙初始速度', value: '8 mL/h' },
        { label: '体内 iCa 目标', value: '0.9–1.1 mmol/L' },
      ],
      messages: [
        '2026 版 CRRT 处方液指南允许 RCA 使用含钙或无钙处方液；该 8 mL/h 为 2023 RCA 指南中的特定初始经验值。',
        '治疗中仍需根据体内离子钙动态调整。',
      ],
    }
  }

  return {
    status: 'unsupported',
    title,
    rows: [],
    messages: ['“其他”含钙情况暂不自动套用补钙公式。'],
  }
}

function bicarbonateConcentrationMmolMl(
  preparation?: string,
  custom?: number,
): number | undefined {
  if (preparation === 'sodium_bicarbonate_1_4pct') return 0.1667
  if (preparation === 'sodium_bicarbonate_5pct') return 0.5952
  if (preparation === 'sodium_bicarbonate_8_4pct') return 1
  if (preparation === '__other__') return custom
  return undefined
}

function calculateBicarbonate(
  input: ElectrolyteCalculationInput,
): ComponentCalculationResult {
  const title = 'NaHCO₃（碳酸氢钠）'

  // NaHCO3 是选填模块：仅选择一个制剂用于记录，不代表一定要做补碱计算。
  // 当用户开始填写浓度 / 目标 / 流量中的任一计算参数后，才进入完整性校验。
  const calculationStarted =
    input.bicarbonateCustomMmolMl !== undefined ||
    input.bicarbonateBaseMmolL !== undefined ||
    input.bicarbonateTargetMmolL !== undefined ||
    input.bicarbonateCarrierFlowMlH !== undefined

  if (!calculationStarted) return idle(title)

  if (!input.bicarbonatePreparation) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请选择 NaHCO₃ 制剂规格。'],
    }
  }

  const concentration = bicarbonateConcentrationMmolMl(
    input.bicarbonatePreparation,
    input.bicarbonateCustomMmolMl,
  )

  if (!concentration || concentration <= 0) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入该 NaHCO₃ 制剂的实际浓度（mmol/mL）。'],
    }
  }

  if (input.bicarbonateBaseMmolL === undefined) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入基础处方液当前 HCO₃⁻ 浓度。'],
    }
  }

  if (input.bicarbonateTargetMmolL === undefined) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入医生设定的目标处方液 HCO₃⁻ 浓度。'],
    }
  }

  if (!input.bicarbonateCarrierFlowMlH || input.bicarbonateCarrierFlowMlH <= 0) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入需要补碱的基础处方液流量。'],
    }
  }

  const delta = input.bicarbonateTargetMmolL - input.bicarbonateBaseMmolL

  if (delta < 0) {
    return {
      status: 'invalid',
      title,
      rows: [],
      messages: [
        '目标 HCO₃⁻ 浓度低于基础液浓度，不能通过继续加入 NaHCO₃ 实现；应减少额外补碱或调整基础处方液。',
      ],
    }
  }

  const bicarbonateMmolH = delta * (input.bicarbonateCarrierFlowMlH / 1000)
  const pumpRateMlH = bicarbonateMmolH / concentration

  const messages = [
    '2026 版指南推荐优先使用碳酸氢盐处方液，但未规定所有患者统一的目标 HCO₃⁻ 浓度，因此目标值由医生设定。',
  ]

  if (input.anticoagulationMethod === 'citrate') {
    messages.push(
      'RCA 本身会产生碱负荷；2023 RCA 指南强调发生代谢性碱中毒时优先减少额外 NaHCO₃，代谢性酸中毒且排除枸橼酸蓄积后才考虑增加补碱。',
    )
  }

  return {
    status: 'ready',
    title,
    rows: [
      { label: '需增加 HCO₃⁻', value: `${round(delta, 1)} mmol/L` },
      { label: '补碱需求', value: `${round(bicarbonateMmolH, 1)} mmol/h` },
      { label: 'NaHCO₃ 泵速', value: `${round(pumpRateMlH, 1)} mL/h` },
    ],
    messages,
  }
}

function potassiumConcentrationMmolMl(
  preparation?: string,
  custom?: number,
): number | undefined {
  if (preparation === 'potassium_chloride_10pct') return 1.341
  if (preparation === 'potassium_chloride_15pct') return 2.012
  if (preparation === '__other__') return custom
  return undefined
}

function calculatePotassium(
  input: ElectrolyteCalculationInput,
): ComponentCalculationResult {
  const title = 'KCl（氯化钾）'

  // KCl 同样是选填模块。仅记录“高钾情景”或制剂规格时不强制补齐整套配液参数。
  const calculationStarted =
    input.potassiumCustomMmolMl !== undefined ||
    input.potassiumBaseMmolL !== undefined ||
    input.potassiumTargetMmolL !== undefined ||
    input.potassiumBagVolumeL !== undefined

  if (!calculationStarted) return idle(title)

  if (!input.potassiumChloridePreparation) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请选择 KCl 制剂规格。'],
    }
  }

  const concentration = potassiumConcentrationMmolMl(
    input.potassiumChloridePreparation,
    input.potassiumCustomMmolMl,
  )

  if (!concentration || concentration <= 0) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入该 KCl 制剂的实际浓度（mmol/mL）。'],
    }
  }

  if (input.potassiumBaseMmolL === undefined) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入基础置换液 / 透析液当前钾浓度。'],
    }
  }

  if (input.potassiumTargetMmolL === undefined) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入医生设定的目标处方液钾浓度。'],
    }
  }

  if (!input.potassiumBagVolumeL || input.potassiumBagVolumeL <= 0) {
    return {
      status: 'incomplete',
      title,
      rows: [],
      messages: ['请输入单袋基础处方液体积。'],
    }
  }

  const delta = input.potassiumTargetMmolL - input.potassiumBaseMmolL

  if (delta < 0) {
    return {
      status: 'invalid',
      title,
      rows: [],
      messages: [
        '目标钾浓度低于基础液钾浓度，无法通过加入 KCl 降低钾浓度；应改用更低钾或无钾处方液。',
      ],
    }
  }

  const potassiumMmolPerBag = delta * input.potassiumBagVolumeL
  const kclMlPerBag = potassiumMmolPerBag / concentration
  const messages: string[] = [
    '计算器只做“基础液浓度 → 目标处方液浓度”的配液换算；目标钾浓度仍由医生根据实时血钾设定。',
  ]

  if (input.potassiumContext === 'hyperkalemia') {
    if (input.potassiumTargetMmolL > 2) {
      messages.push('当前目标高于 2026 版指南对高钾血症 CRRT 建议的 0–2 mmol/L 处方液钾浓度范围，请核对。')
    } else {
      messages.push('2026 版指南：高钾血症 CRRT 可使用钾浓度 0–2 mmol/L 的置换液 / 透析液，并在上机后 1–2 h 加强复查。')
    }
  }

  return {
    status: 'ready',
    title,
    rows: [
      { label: '每袋需增加 K⁺', value: `${round(potassiumMmolPerBag, 1)} mmol` },
      { label: 'KCl 加入量', value: `${round(kclMlPerBag, 1)} mL/袋` },
      { label: '目标处方液钾浓度', value: `${round(input.potassiumTargetMmolL, 1)} mmol/L` },
    ],
    messages,
  }
}

export function calculateElectrolytes(
  input: ElectrolyteCalculationInput,
): ElectrolyteCalculationResult {
  return {
    calcium: calculateCalcium(input),
    bicarbonate: calculateBicarbonate(input),
    potassium: calculatePotassium(input),
  }
}
