import type { AnticoagulationCalculationResult } from '../calculators/anticoagulation'
import type {
  ComponentCalculationResult,
  ElectrolyteCalculationResult,
} from '../calculators/electrolytes'
import type { FluidCalculationResult } from '../calculators/fluid'
import type { ValidationIssue } from '../validation/prescription'

export type SummaryInputRow = {
  label: string
  value: string
}

export type PrescriptionSummaryInput = {
  inputRows: SummaryInputRow[]
  fluid: FluidCalculationResult
  anticoagulation: AnticoagulationCalculationResult
  electrolytes: ElectrolyteCalculationResult
  validationIssues: ValidationIssue[]
}

export const calculationSourceRows: SummaryInputRow[] = [
  {
    label: 'CRRT 处方液',
    value: '《中国连续肾脏替代治疗处方液体应用临床实践指南（2026版）》',
  },
  {
    label: 'RCA 管理 / 补钙',
    value: 'Chinese emergency medical doctor consensus（2023）',
  },
  {
    label: '普通肝素',
    value: '《抗凝技术在危重症肾脏替代治疗应用的中国专家共识（2023年版）》',
  },
]

function addSection(lines: string[], title: string, rows: SummaryInputRow[]) {
  if (rows.length === 0) return
  if (lines.length > 0) lines.push('')
  lines.push(`【${title}】`)
  rows.forEach((row) => lines.push(`${row.label}：${row.value}`))
}

function readyRows(result: ComponentCalculationResult): SummaryInputRow[] {
  if (result.status === 'idle') return []
  return result.rows
}

export function buildPrescriptionSummary(input: PrescriptionSummaryInput) {
  const lines: string[] = ['CRRT / CBP 处方参数计算摘要']

  addSection(lines, '当前输入', input.inputRows)

  const fluidRows: SummaryInputRow[] = []
  if (input.fluid.targetEffluentMlH !== undefined) {
    fluidRows.push({
      label: '目标总流出液量',
      value: `${input.fluid.targetEffluentMlH} mL/h`,
    })
  }
  if (input.fluid.clearanceFluidMlH !== undefined) {
    fluidRows.push({
      label: '置换液 + 透析液',
      value: `${input.fluid.clearanceFluidMlH} mL/h`,
    })
  }
  if (input.fluid.replacementFlowMlH !== undefined) {
    fluidRows.push({
      label: '置换液速度',
      value: `${input.fluid.replacementFlowMlH} mL/h`,
    })
  }
  if (input.fluid.dialysateFlowMlH !== undefined) {
    fluidRows.push({
      label: '透析液速度',
      value: `${input.fluid.dialysateFlowMlH} mL/h`,
    })
  }
  if (input.fluid.status !== 'unsupported') {
    fluidRows.push({
      label: '净超滤速度',
      value: `${input.fluid.netUfMlH} mL/h`,
    })
  }
  addSection(lines, '液体量', fluidRows)

  if (input.anticoagulation.status !== 'idle') {
    addSection(lines, input.anticoagulation.title, input.anticoagulation.rows)
  }

  addSection(lines, '葡萄糖酸钙', readyRows(input.electrolytes.calcium))
  addSection(lines, 'NaHCO₃（碳酸氢钠）', readyRows(input.electrolytes.bicarbonate))
  addSection(lines, 'KCl（氯化钾）', readyRows(input.electrolytes.potassium))

  const warnings = input.validationIssues.filter(
    (issue) => issue.severity === 'warning' || issue.severity === 'info',
  )
  if (warnings.length > 0) {
    addSection(
      lines,
      '需核对',
      warnings.map((issue) => ({ label: issue.title, value: issue.message })),
    )
  }

  addSection(lines, '公式库主要依据版本', calculationSourceRows)

  lines.push('')
  lines.push('说明：本工具用于处方参数换算与已接入规则校验；治疗中仍需结合实时监测和临床判断调整。')

  return lines.join('\n')
}
