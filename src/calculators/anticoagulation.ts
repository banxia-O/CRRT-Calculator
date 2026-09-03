export type AnticoagulationCalculationInput = {
  method?: string
  weightKg?: number
  bloodFlowMlMin?: number
  citratePreparation?: string
  citrateCustomMmolL?: number
  citrateTargetMmolL?: number
  heparinConcentrationIuMl?: number
}

export type CalculationRow = {
  label: string
  value: string
}

export type AnticoagulationCalculationResult = {
  status: 'idle' | 'ready' | 'incomplete' | 'unsupported' | 'invalid'
  title: string
  rows: CalculationRow[]
  messages: string[]
}

const round = (value: number, digits = 1) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function calculateCitrate(
  input: AnticoagulationCalculationInput,
): AnticoagulationCalculationResult {
  const rows: CalculationRow[] = []
  const messages: string[] = []

  if (!input.bloodFlowMlMin || input.bloodFlowMlMin <= 0) {
    return {
      status: 'incomplete',
      title: '枸橼酸抗凝',
      rows,
      messages: ['请输入血流量后再计算枸橼酸初始泵速。'],
    }
  }

  if (!input.citratePreparation) {
    return {
      status: 'incomplete',
      title: '枸橼酸抗凝',
      rows,
      messages: ['请选择枸橼酸制剂。'],
    }
  }

  if (input.citratePreparation === 'citrate_replacement_0_5pct') {
    return {
      status: 'unsupported',
      title: '枸橼酸抗凝',
      rows: [
        { label: '2026版指南', value: '允许 0.5% 枸橼酸盐置换液' },
        { label: '滤器后 iCa 初始目标', value: '0.2–0.3 mmol/L' },
      ],
      messages: [
        '0.5% 枸橼酸盐置换液属于整套处方液方案，不能直接套用“4%枸橼酸泵速”公式；Phase 3 暂不自动换算。',
      ],
    }
  }

  let citrateConcentrationMmolL: number | undefined

  if (input.citratePreparation === 'trisodium_citrate_4pct') {
    // 4% trisodium citrate dihydrate is approximately 136 mmol/L citrate.
    citrateConcentrationMmolL = 136
  } else if (input.citratePreparation === '__other__') {
    citrateConcentrationMmolL = input.citrateCustomMmolL
  } else {
    return {
      status: 'unsupported',
      title: '枸橼酸抗凝',
      rows,
      messages: ['当前枸橼酸制剂尚未接入自动换算。'],
    }
  }

  if (!citrateConcentrationMmolL || citrateConcentrationMmolL <= 0) {
    return {
      status: 'incomplete',
      title: '枸橼酸抗凝',
      rows,
      messages: ['请输入该制剂的枸橼酸根浓度（mmol/L）。'],
    }
  }

  const calculatePumpRate = (targetMmolL: number) =>
    (input.bloodFlowMlMin! * 60 * targetMmolL) / citrateConcentrationMmolL!

  rows.push({
    label: '枸橼酸制剂浓度',
    value: `${round(citrateConcentrationMmolL, 1)} mmol/L`,
  })

  if (input.citrateTargetMmolL !== undefined) {
    if (input.citrateTargetMmolL <= 0) {
      return {
        status: 'invalid',
        title: '枸橼酸抗凝',
        rows,
        messages: ['目标体外血液枸橼酸浓度必须大于 0。'],
      }
    }

    rows.push({
      label: '目标体外枸橼酸浓度',
      value: `${input.citrateTargetMmolL} mmol/L`,
    })
    rows.push({
      label: '初始枸橼酸泵速',
      value: `${round(calculatePumpRate(input.citrateTargetMmolL), 1)} mL/h`,
    })

    if (input.citrateTargetMmolL < 3 || input.citrateTargetMmolL > 4) {
      messages.push('当前输入超出传统 3–4 mmol/L 初始体外枸橼酸浓度范围，请核对处方依据。')
    }
  } else {
    rows.push({
      label: '3 mmol/L 对应泵速',
      value: `${round(calculatePumpRate(3), 1)} mL/h`,
    })
    rows.push({
      label: '4 mmol/L 对应泵速',
      value: `${round(calculatePumpRate(4), 1)} mL/h`,
    })
  }

  rows.push({ label: '滤器后 iCa 初始目标', value: '0.2–0.3 mmol/L' })
  rows.push({ label: '枸橼酸蓄积高风险时 iCa', value: '0.3–0.4 mmol/L' })

  messages.push('泵速仅作为初始换算；治疗中需根据滤器后离子钙动态调整枸橼酸速度。')
  messages.push('葡萄糖酸钙补充量在 Phase 4 单独计算，不与枸橼酸泵速绑死。')

  return {
    status: 'ready',
    title: '枸橼酸抗凝',
    rows,
    messages,
  }
}

function calculateHeparin(
  input: AnticoagulationCalculationInput,
): AnticoagulationCalculationResult {
  const rows: CalculationRow[] = []
  const messages: string[] = []

  if (!input.weightKg || input.weightKg <= 0) {
    return {
      status: 'incomplete',
      title: '普通肝素抗凝',
      rows,
      messages: ['请输入体重后再计算肝素剂量范围。'],
    }
  }

  const bolusMin = input.weightKg * 5
  const bolusMax = input.weightKg * 15
  const maintenanceMin = input.weightKg * 5
  const maintenanceMax = input.weightKg * 10

  rows.push({
    label: '首剂范围',
    value: `${round(bolusMin, 0)}–${round(bolusMax, 0)} IU`,
  })
  rows.push({
    label: '维持剂量范围',
    value: `${round(maintenanceMin, 0)}–${round(maintenanceMax, 0)} IU/h`,
  })

  if (input.heparinConcentrationIuMl !== undefined) {
    if (input.heparinConcentrationIuMl <= 0) {
      return {
        status: 'invalid',
        title: '普通肝素抗凝',
        rows,
        messages: ['肝素配置浓度必须大于 0。'],
      }
    }

    rows.push({
      label: '维持泵速范围',
      value: `${round(maintenanceMin / input.heparinConcentrationIuMl, 2)}–${round(maintenanceMax / input.heparinConcentrationIuMl, 2)} mL/h`,
    })
  } else {
    messages.push('填写肝素泵内实际浓度后，可继续换算维持泵速（mL/h）。')
  }

  rows.push({ label: 'APTT 监测目标', value: '45–60 s' })
  rows.push({ label: '抗 Xa 活性目标', value: '0.3–0.6 IU/mL' })

  messages.push('以上为2023年中国专家共识中的CRRT普通肝素起始范围，后续应依据出血风险及抗凝监测调整。')

  return {
    status: 'ready',
    title: '普通肝素抗凝',
    rows,
    messages,
  }
}

export function calculateAnticoagulation(
  input: AnticoagulationCalculationInput,
): AnticoagulationCalculationResult {
  if (!input.method) {
    return {
      status: 'idle',
      title: '抗凝计算',
      rows: [],
      messages: [],
    }
  }

  if (input.method === 'none') {
    return {
      status: 'ready',
      title: '无抗凝',
      rows: [],
      messages: ['当前选择无抗凝，不计算抗凝药物剂量。'],
    }
  }

  if (input.method === 'citrate') {
    return calculateCitrate(input)
  }

  if (input.method === 'heparin') {
    return calculateHeparin(input)
  }

  return {
    status: 'unsupported',
    title: '抗凝计算',
    rows: [],
    messages: ['“其他”抗凝方案暂不自动计算，可继续使用自由输入记录。'],
  }
}
