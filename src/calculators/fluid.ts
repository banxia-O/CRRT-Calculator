export type FluidCalculationInput = {
  weightKg?: number
  targetDoseMlKgH?: number
  mode?: string
  fluidAllocation?: string
  replacementSharePct?: number
  dialysateSharePct?: number
  netUfMlH?: number
  replacementPosition?: string
}

export type FluidCalculationResult = {
  status: 'ready' | 'incomplete' | 'unsupported' | 'invalid'
  targetEffluentMlH?: number
  clearanceFluidMlH?: number
  replacementFlowMlH?: number
  dialysateFlowMlH?: number
  netUfMlH: number
  messages: string[]
}

const roundFlow = (value: number) => Math.round(value)

// 2026 中国 CRRT 处方液指南将 >50 mL/kg/h 定义为高容量血液滤过（HVHF）。
// 100 mL/kg/h 不是临床“绝对上限”，而是本工具的单位误填保护阈值：
// 超过该值时更常见的风险是把 mL/h 总流量误填进 mL/kg/h 字段。
const HIGH_VOLUME_DOSE_ML_KG_H = 50
const UNIT_GUARD_DOSE_ML_KG_H = 100

export function calculateFluidPrescription(
  input: FluidCalculationInput,
): FluidCalculationResult {
  const netUfMlH = Math.max(0, input.netUfMlH ?? 0)
  const messages: string[] = []

  if (!input.weightKg || input.weightKg <= 0) {
    return { status: 'incomplete', netUfMlH, messages: ['请输入体重。'] }
  }

  if (!input.targetDoseMlKgH || input.targetDoseMlKgH <= 0) {
    return { status: 'incomplete', netUfMlH, messages: ['请输入目标治疗剂量。'] }
  }

  if (input.targetDoseMlKgH > UNIT_GUARD_DOSE_ML_KG_H) {
    return {
      status: 'invalid',
      netUfMlH,
      messages: [
        `目标治疗剂量填写为 ${input.targetDoseMlKgH} mL/kg/h，远高于本工具支持的常规处方范围。请确认是否把“总流量 mL/h”误填进了“mL/kg/h”字段；例如 70 kg × 25 mL/kg/h = 1750 mL/h。`,
      ],
    }
  }

  if (input.targetDoseMlKgH > HIGH_VOLUME_DOSE_ML_KG_H) {
    messages.push(
      '当前目标治疗剂量 >50 mL/kg/h，已进入2026版指南所述高容量范围，请核对处方目的并避免单位误填。',
    )
  }

  if (!input.mode) {
    return { status: 'incomplete', netUfMlH, messages: ['请选择 CRRT / CBP 模式。'] }
  }

  if (input.mode === 'scuf') {
    return {
      status: 'unsupported',
      netUfMlH,
      messages: ['SCUF 主要围绕净超滤目标设定，Phase 2 暂不按溶质清除剂量自动计算。'],
    }
  }

  if (input.mode === '__other__') {
    return {
      status: 'unsupported',
      netUfMlH,
      messages: ['“其他”治疗模式暂不套用自动液体分配公式。'],
    }
  }

  const targetEffluentMlH = input.weightKg * input.targetDoseMlKgH

  if (netUfMlH > targetEffluentMlH) {
    return {
      status: 'invalid',
      targetEffluentMlH: roundFlow(targetEffluentMlH),
      netUfMlH,
      messages: ['净超滤速度不能高于当前目标总流出液量，请核对输入。'],
    }
  }

  // CRRT 处方剂量通常以总流出液量/体重表示。
  // 此处把净超滤单独列出，因此剩余流量再由置换液与透析液承担。
  const clearanceFluidMlH = targetEffluentMlH - netUfMlH
  let replacementFlowMlH = 0
  let dialysateFlowMlH = 0

  if (input.mode === 'cvvh') {
    replacementFlowMlH = clearanceFluidMlH
  } else if (input.mode === 'cvvhd') {
    dialysateFlowMlH = clearanceFluidMlH
  } else if (input.mode === 'cvvhdf') {
    if (input.fluidAllocation === 'one_to_one') {
      replacementFlowMlH = clearanceFluidMlH / 2
      dialysateFlowMlH = clearanceFluidMlH / 2
    } else if (input.fluidAllocation === 'custom_ratio') {
      const replacementShare = input.replacementSharePct
      const dialysateShare = input.dialysateSharePct

      if (
        replacementShare === undefined ||
        dialysateShare === undefined ||
        replacementShare < 0 ||
        dialysateShare < 0
      ) {
        return {
          status: 'incomplete',
          targetEffluentMlH: roundFlow(targetEffluentMlH),
          clearanceFluidMlH: roundFlow(clearanceFluidMlH),
          netUfMlH,
          messages: ['请输入 CVVHDF 的置换液和透析液占比。'],
        }
      }

      const shareTotal = replacementShare + dialysateShare
      if (Math.abs(shareTotal - 100) > 0.5) {
        return {
          status: 'invalid',
          targetEffluentMlH: roundFlow(targetEffluentMlH),
          clearanceFluidMlH: roundFlow(clearanceFluidMlH),
          netUfMlH,
          messages: ['置换液占比 + 透析液占比需要合计为 100%。'],
        }
      }

      replacementFlowMlH = clearanceFluidMlH * (replacementShare / 100)
      dialysateFlowMlH = clearanceFluidMlH * (dialysateShare / 100)
    } else {
      return {
        status: 'incomplete',
        targetEffluentMlH: roundFlow(targetEffluentMlH),
        clearanceFluidMlH: roundFlow(clearanceFluidMlH),
        netUfMlH,
        messages: ['CVVHDF 没有唯一固定的置换液/透析液拆分比例，请选择 1:1 或自定义比例。'],
      }
    }
  } else {
    return {
      status: 'unsupported',
      targetEffluentMlH: roundFlow(targetEffluentMlH),
      netUfMlH,
      messages: ['当前模式尚未接入液体量自动计算。'],
    }
  }

  if (input.replacementPosition === 'pre') {
    messages.push('当前结果按处方流出液量计算；前稀释可能降低实际溶质清除效率，暂未做前稀释校正。')
  }

  return {
    status: 'ready',
    targetEffluentMlH: roundFlow(targetEffluentMlH),
    clearanceFluidMlH: roundFlow(clearanceFluidMlH),
    replacementFlowMlH: roundFlow(replacementFlowMlH),
    dialysateFlowMlH: roundFlow(dialysateFlowMlH),
    netUfMlH: roundFlow(netUfMlH),
    messages,
  }
}
