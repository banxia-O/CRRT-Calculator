import { steps } from '../clinical/config'
import { visibleFields } from '../flow/engine'
import type { FormState } from '../flow/types'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export type ValidationIssue = {
  id: string
  severity: ValidationSeverity
  title: string
  message: string
  fieldIds?: string[]
}

export type ValidationResult = {
  issues: ValidationIssue[]
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  infos: ValidationIssue[]
  byField: Record<string, ValidationIssue[]>
  hasErrors: boolean
}

const fieldLabels = new Map(
  steps.flatMap((step) => step.fields.map((field) => [field.id, field.label] as const)),
)

const isSet = (value: unknown) => value !== undefined && value !== ''
const asNumber = (value: unknown) => (typeof value === 'number' ? value : undefined)
const asString = (value: unknown) => (typeof value === 'string' ? value : undefined)

function emptyResult(): ValidationResult {
  return {
    issues: [],
    errors: [],
    warnings: [],
    infos: [],
    byField: {},
    hasErrors: false,
  }
}

export function validatePrescription(
  state: FormState,
  otherValues: Record<string, string> = {},
): ValidationResult {
  const hasAnyInput = Object.values(state).some(isSet)
  if (!hasAnyInput) return emptyResult()

  const issues: ValidationIssue[] = []
  const add = (issue: ValidationIssue) => issues.push(issue)

  const visible = steps.flatMap((step) => visibleFields(step.fields, state))
  const visibleIds = new Set(visible.map((field) => field.id))

  for (const field of visible) {
    if (state[field.id] === '__other__' && !otherValues[field.id]?.trim()) {
      add({
        id: `other.${field.id}.missing_text`,
        severity: 'warning',
        title: `${field.label}选择了“其他”`,
        message: '请补充具体内容，否则该分支只能记录为“其他”，不能参与自动换算。',
        fieldIds: [field.id],
      })
    }
  }

  const weight = asNumber(state.weight)
  const targetDose = asNumber(state.targetDose)
  const bloodFlow = asNumber(state.bloodFlow)
  const netUf = asNumber(state.netUf)
  const mode = asString(state.mode)

  if (weight === undefined) {
    add({
      id: 'core.weight.missing',
      severity: 'warning',
      title: '缺少体重',
      message: '体重是液体量和普通肝素剂量计算的基础参数。',
      fieldIds: ['weight'],
    })
  } else if (weight <= 0) {
    add({
      id: 'core.weight.invalid',
      severity: 'error',
      title: '体重输入无效',
      message: '体重必须大于 0 kg。',
      fieldIds: ['weight'],
    })
  }

  if (!mode) {
    add({
      id: 'core.mode.missing',
      severity: 'warning',
      title: '缺少治疗模式',
      message: '请选择 CRRT / CBP 模式后再拆分置换液和透析液。',
      fieldIds: ['mode'],
    })
  }

  if (targetDose === undefined) {
    add({
      id: 'core.targetDose.missing',
      severity: 'warning',
      title: '缺少目标治疗剂量',
      message: '请填写由临床医生设定的目标治疗剂量。',
      fieldIds: ['targetDose'],
    })
  } else if (targetDose <= 0) {
    add({
      id: 'core.targetDose.invalid',
      severity: 'error',
      title: '目标治疗剂量无效',
      message: '目标治疗剂量必须大于 0 mL/kg/h。',
      fieldIds: ['targetDose'],
    })
  }

  if (bloodFlow !== undefined && bloodFlow <= 0) {
    add({
      id: 'core.bloodFlow.invalid',
      severity: 'error',
      title: '血流量无效',
      message: '已填写血流量时，该值必须大于 0 mL/min。',
      fieldIds: ['bloodFlow'],
    })
  }

  if (netUf !== undefined && netUf < 0) {
    add({
      id: 'core.netUf.invalid',
      severity: 'error',
      title: '净超滤速度无效',
      message: '净超滤速度不能为负数。',
      fieldIds: ['netUf'],
    })
  }

  if (
    weight !== undefined &&
    weight > 0 &&
    targetDose !== undefined &&
    targetDose > 0 &&
    netUf !== undefined &&
    netUf >= 0
  ) {
    const targetEffluent = weight * targetDose
    if (netUf > targetEffluent) {
      add({
        id: 'fluid.netUf.exceeds_effluent',
        severity: 'error',
        title: '净超滤超过目标总流出液量',
        message: `当前目标总流出液量约 ${Math.round(targetEffluent)} mL/h，净超滤不能高于该值。`,
        fieldIds: ['netUf', 'weight', 'targetDose'],
      })
    }
  }

  if (mode === 'cvvhdf') {
    const allocation = asString(state.fluidAllocation)
    if (!allocation) {
      add({
        id: 'fluid.cvvhdf.allocation_missing',
        severity: 'warning',
        title: 'CVVHDF 尚未设置液体分配',
        message: 'CVVHDF 没有唯一固定的置换液 / 透析液比例，请选择 1:1 或自定义比例。',
        fieldIds: ['fluidAllocation'],
      })
    } else if (allocation === 'by_mode' || allocation === '__other__') {
      add({
        id: 'fluid.cvvhdf.allocation_unsupported',
        severity: 'warning',
        title: '当前分配方式不能自动计算',
        message: '当前版本只有 1:1 和自定义比例会输出明确的置换液 / 透析液速度。',
        fieldIds: ['fluidAllocation'],
      })
    } else if (allocation === 'custom_ratio') {
      const replacementShare = asNumber(state.replacementShare)
      const dialysateShare = asNumber(state.dialysateShare)

      if (replacementShare === undefined || dialysateShare === undefined) {
        add({
          id: 'fluid.cvvhdf.ratio_missing',
          severity: 'warning',
          title: '自定义比例未填写完整',
          message: '请同时填写置换液占比和透析液占比。',
          fieldIds: ['replacementShare', 'dialysateShare'],
        })
      } else {
        if (
          replacementShare < 0 ||
          replacementShare > 100 ||
          dialysateShare < 0 ||
          dialysateShare > 100
        ) {
          add({
            id: 'fluid.cvvhdf.ratio_out_of_range',
            severity: 'error',
            title: '液体占比超出范围',
            message: '置换液和透析液占比都应在 0%–100% 之间。',
            fieldIds: ['replacementShare', 'dialysateShare'],
          })
        }

        if (Math.abs(replacementShare + dialysateShare - 100) > 0.5) {
          add({
            id: 'fluid.cvvhdf.ratio_not_100',
            severity: 'error',
            title: '液体占比合计不为 100%',
            message: '置换液占比 + 透析液占比需要合计为 100%。',
            fieldIds: ['replacementShare', 'dialysateShare'],
          })
        }
      }
    }
  }

  if ((mode === 'cvvh' || mode === 'cvvhdf') && !state.replacementPosition) {
    add({
      id: 'fluid.replacement_position.missing',
      severity: 'info',
      title: '尚未记录置换液稀释方式',
      message: '前 / 后稀释会影响有效清除解释，并影响部分含钙方案的自动提示。',
      fieldIds: ['replacementPosition'],
    })
  }

  if (mode === '__other__') {
    add({
      id: 'mode.other.unsupported',
      severity: 'info',
      title: '其他治疗模式仅作记录',
      message: '当前版本不会对“其他”治疗模式套用自动液体计算公式。',
      fieldIds: ['mode'],
    })
  }

  const anticoagulation = asString(state.anticoagulation)

  if (anticoagulation === 'citrate') {
    if (bloodFlow === undefined) {
      add({
        id: 'citrate.bloodFlow.missing',
        severity: 'warning',
        title: '枸橼酸计算缺少血流量',
        message: '4% 枸橼酸钠初始泵速按血流量换算，请先填写血流量。',
        fieldIds: ['bloodFlow'],
      })
    }

    const preparation = asString(state.citratePreparation)
    if (!preparation) {
      add({
        id: 'citrate.preparation.missing',
        severity: 'warning',
        title: '缺少枸橼酸制剂',
        message: '请选择实际使用的枸橼酸制剂。',
        fieldIds: ['citratePreparation'],
      })
    }

    if (preparation === '__other__') {
      const concentration = asNumber(state.citrateCustomMmolL)
      if (concentration === undefined) {
        add({
          id: 'citrate.custom_concentration.missing',
          severity: 'warning',
          title: '缺少自定义枸橼酸浓度',
          message: '请输入实际枸橼酸根浓度，单位 mmol/L。',
          fieldIds: ['citrateCustomMmolL'],
        })
      } else if (concentration <= 0) {
        add({
          id: 'citrate.custom_concentration.invalid',
          severity: 'error',
          title: '枸橼酸浓度无效',
          message: '自定义枸橼酸根浓度必须大于 0 mmol/L。',
          fieldIds: ['citrateCustomMmolL'],
        })
      }
    }

    const citrateTarget = asNumber(state.citrateTarget)
    if (citrateTarget !== undefined) {
      if (citrateTarget <= 0) {
        add({
          id: 'citrate.target.invalid',
          severity: 'error',
          title: '目标枸橼酸浓度无效',
          message: '目标体外血液枸橼酸浓度必须大于 0 mmol/L。',
          fieldIds: ['citrateTarget'],
        })
      } else if (citrateTarget < 3 || citrateTarget > 4) {
        add({
          id: 'citrate.target.outside_initial_range',
          severity: 'warning',
          title: '目标枸橼酸浓度超出常用初始范围',
          message: '当前输入不在传统 3–4 mmol/L 初始体外枸橼酸浓度范围内，请核对处方依据。',
          fieldIds: ['citrateTarget'],
        })
      }
    }

    if (!state.calciumFluidType) {
      add({
        id: 'citrate.calcium_fluid_type.missing',
        severity: 'warning',
        title: 'RCA 尚未选择处方液含钙情况',
        message: '含钙 / 无钙方案会影响葡萄糖酸钙初始计算。',
        fieldIds: ['calciumFluidType'],
      })
    }

    if (!state.calciumGluconatePreparation) {
      add({
        id: 'citrate.calcium_preparation.missing',
        severity: 'warning',
        title: 'RCA 尚未选择补钙制剂',
        message: '请选择实际补钙制剂后再查看补钙初始换算。',
        fieldIds: ['calciumGluconatePreparation'],
      })
    }

    if (preparation === 'citrate_replacement_0_5pct') {
      add({
        id: 'citrate.0_5pct.manual',
        severity: 'info',
        title: '0.5% 枸橼酸盐置换液需按整套方案处理',
        message: '当前版本不会把 0.5% 枸橼酸盐置换液错误套入 4% 枸橼酸钠独立泵速公式。',
        fieldIds: ['citratePreparation'],
      })
    }
  }

  if (anticoagulation === 'heparin') {
    const heparinConcentration = asNumber(state.heparinConcentration)
    if (heparinConcentration !== undefined && heparinConcentration <= 0) {
      add({
        id: 'heparin.concentration.invalid',
        severity: 'error',
        title: '肝素配置浓度无效',
        message: '肝素配置浓度必须大于 0 IU/mL。',
        fieldIds: ['heparinConcentration'],
      })
    }
  }

  if (anticoagulation === '__other__') {
    add({
      id: 'anticoagulation.other.unsupported',
      severity: 'info',
      title: '其他抗凝方案仅作记录',
      message: '当前自动计算只覆盖局部枸橼酸抗凝和普通肝素。',
      fieldIds: ['anticoagulation'],
    })
  }

  const bicarbonateFields = [
    'bicarbonatePreparation',
    'bicarbonateCustomMmolMl',
    'bicarbonateBaseMmolL',
    'bicarbonateTargetMmolL',
    'bicarbonateCarrierFlowMlH',
  ]
  const bicarbonateActive = bicarbonateFields.some((id) => visibleIds.has(id) && isSet(state[id]))

  if (bicarbonateActive) {
    const preparation = asString(state.bicarbonatePreparation)
    const base = asNumber(state.bicarbonateBaseMmolL)
    const target = asNumber(state.bicarbonateTargetMmolL)
    const carrier = asNumber(state.bicarbonateCarrierFlowMlH)

    if (!preparation) {
      add({
        id: 'bicarbonate.preparation.missing',
        severity: 'warning',
        title: '补碱计算缺少 NaHCO₃ 制剂',
        message: '请选择实际 NaHCO₃ 制剂规格。',
        fieldIds: ['bicarbonatePreparation'],
      })
    }

    if (preparation === '__other__') {
      const concentration = asNumber(state.bicarbonateCustomMmolMl)
      if (concentration === undefined) {
        add({
          id: 'bicarbonate.custom_concentration.missing',
          severity: 'warning',
          title: '缺少 NaHCO₃ 实际浓度',
          message: '请输入自定义制剂浓度，单位 mmol/mL。',
          fieldIds: ['bicarbonateCustomMmolMl'],
        })
      } else if (concentration <= 0) {
        add({
          id: 'bicarbonate.custom_concentration.invalid',
          severity: 'error',
          title: 'NaHCO₃ 浓度无效',
          message: '自定义 NaHCO₃ 浓度必须大于 0 mmol/mL。',
          fieldIds: ['bicarbonateCustomMmolMl'],
        })
      }
    }

    if (base === undefined) {
      add({
        id: 'bicarbonate.base.missing',
        severity: 'warning',
        title: '缺少基础液 HCO₃⁻ 浓度',
        message: '请按实际基础处方液标签填写。',
        fieldIds: ['bicarbonateBaseMmolL'],
      })
    } else if (base < 0) {
      add({
        id: 'bicarbonate.base.invalid',
        severity: 'error',
        title: '基础液 HCO₃⁻ 浓度无效',
        message: '处方液 HCO₃⁻ 浓度不能为负数。',
        fieldIds: ['bicarbonateBaseMmolL'],
      })
    }

    if (target === undefined) {
      add({
        id: 'bicarbonate.target.missing',
        severity: 'warning',
        title: '缺少目标 HCO₃⁻ 浓度',
        message: '目标浓度需由医生根据实时酸碱状态设定。',
        fieldIds: ['bicarbonateTargetMmolL'],
      })
    } else if (target < 0) {
      add({
        id: 'bicarbonate.target.invalid',
        severity: 'error',
        title: '目标 HCO₃⁻ 浓度无效',
        message: '目标处方液 HCO₃⁻ 浓度不能为负数。',
        fieldIds: ['bicarbonateTargetMmolL'],
      })
    }

    if (base !== undefined && target !== undefined && target < base) {
      add({
        id: 'bicarbonate.target_below_base',
        severity: 'error',
        title: '目标 HCO₃⁻ 低于基础液浓度',
        message: '加入 NaHCO₃ 只能升高浓度；若目标更低，应减少额外补碱或更换基础液方案。',
        fieldIds: ['bicarbonateBaseMmolL', 'bicarbonateTargetMmolL'],
      })
    }

    if (carrier === undefined) {
      add({
        id: 'bicarbonate.carrier.missing',
        severity: 'warning',
        title: '缺少需要补碱的基础液流量',
        message: '请填写实际需要通过该 NaHCO₃ 泵补碱的处方液流量。',
        fieldIds: ['bicarbonateCarrierFlowMlH'],
      })
    } else if (carrier <= 0) {
      add({
        id: 'bicarbonate.carrier.invalid',
        severity: 'error',
        title: '补碱基础液流量无效',
        message: '需要补碱的基础处方液流量必须大于 0 mL/h。',
        fieldIds: ['bicarbonateCarrierFlowMlH'],
      })
    }
  }

  const potassiumFields = [
    'potassiumContext',
    'potassiumChloridePreparation',
    'potassiumCustomMmolMl',
    'potassiumBaseMmolL',
    'potassiumTargetMmolL',
    'potassiumBagVolumeL',
  ]
  const potassiumActive = potassiumFields.some((id) => visibleIds.has(id) && isSet(state[id]))

  if (potassiumActive) {
    const preparation = asString(state.potassiumChloridePreparation)
    const base = asNumber(state.potassiumBaseMmolL)
    const target = asNumber(state.potassiumTargetMmolL)
    const bagVolume = asNumber(state.potassiumBagVolumeL)

    if (!preparation) {
      add({
        id: 'potassium.preparation.missing',
        severity: 'warning',
        title: '补钾计算缺少 KCl 制剂',
        message: '请选择实际 KCl 制剂规格。',
        fieldIds: ['potassiumChloridePreparation'],
      })
    }

    if (preparation === '__other__') {
      const concentration = asNumber(state.potassiumCustomMmolMl)
      if (concentration === undefined) {
        add({
          id: 'potassium.custom_concentration.missing',
          severity: 'warning',
          title: '缺少 KCl 实际浓度',
          message: '请输入自定义制剂浓度，单位 mmol/mL。',
          fieldIds: ['potassiumCustomMmolMl'],
        })
      } else if (concentration <= 0) {
        add({
          id: 'potassium.custom_concentration.invalid',
          severity: 'error',
          title: 'KCl 浓度无效',
          message: '自定义 KCl 浓度必须大于 0 mmol/mL。',
          fieldIds: ['potassiumCustomMmolMl'],
        })
      }
    }

    if (base === undefined) {
      add({
        id: 'potassium.base.missing',
        severity: 'warning',
        title: '缺少基础液钾浓度',
        message: '请填写实际基础置换液 / 透析液钾浓度。',
        fieldIds: ['potassiumBaseMmolL'],
      })
    } else if (base < 0) {
      add({
        id: 'potassium.base.invalid',
        severity: 'error',
        title: '基础液钾浓度无效',
        message: '基础处方液钾浓度不能为负数。',
        fieldIds: ['potassiumBaseMmolL'],
      })
    }

    if (target === undefined) {
      add({
        id: 'potassium.target.missing',
        severity: 'warning',
        title: '缺少目标处方液钾浓度',
        message: '目标浓度需由医生根据实时血钾设定。',
        fieldIds: ['potassiumTargetMmolL'],
      })
    } else if (target < 0) {
      add({
        id: 'potassium.target.invalid',
        severity: 'error',
        title: '目标处方液钾浓度无效',
        message: '目标处方液钾浓度不能为负数。',
        fieldIds: ['potassiumTargetMmolL'],
      })
    }

    if (base !== undefined && target !== undefined && target < base) {
      add({
        id: 'potassium.target_below_base',
        severity: 'error',
        title: '目标钾浓度低于基础液',
        message: '加入 KCl 不能降低钾浓度，应改用更低钾或无钾基础液。',
        fieldIds: ['potassiumBaseMmolL', 'potassiumTargetMmolL'],
      })
    }

    if (bagVolume === undefined) {
      add({
        id: 'potassium.bag_volume.missing',
        severity: 'warning',
        title: '缺少单袋基础液体积',
        message: '需要单袋体积才能换算 KCl 的 mL/袋。',
        fieldIds: ['potassiumBagVolumeL'],
      })
    } else if (bagVolume <= 0) {
      add({
        id: 'potassium.bag_volume.invalid',
        severity: 'error',
        title: '单袋基础液体积无效',
        message: '单袋基础处方液体积必须大于 0 L。',
        fieldIds: ['potassiumBagVolumeL'],
      })
    }

    if (state.potassiumContext === 'hyperkalemia' && target !== undefined && target > 2) {
      add({
        id: 'potassium.hyperkalemia.target_above_guideline_range',
        severity: 'warning',
        title: '高钾血症目标处方液钾浓度偏高',
        message: '2026版指南对高钾血症 CRRT 建议使用钾浓度 0–2 mmol/L 的置换液 / 透析液，请核对当前目标。',
        fieldIds: ['potassiumContext', 'potassiumTargetMmolL'],
      })
    }
  }

  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const infos = issues.filter((issue) => issue.severity === 'info')
  const byField: Record<string, ValidationIssue[]> = {}

  for (const issue of issues) {
    for (const fieldId of issue.fieldIds ?? []) {
      if (!visibleIds.has(fieldId)) continue
      byField[fieldId] ??= []
      byField[fieldId].push(issue)
    }
  }

  return {
    issues,
    errors,
    warnings,
    infos,
    byField,
    hasErrors: errors.length > 0,
  }
}

export function validationLabel(fieldId: string) {
  return fieldLabels.get(fieldId) ?? fieldId
}
