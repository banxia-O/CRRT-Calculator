import { describe, expect, it } from 'vitest'
import { buildPrescriptionSummary } from './prescription'

const emptyElectrolyte = (title: string) => ({
  status: 'idle' as const,
  title,
  rows: [],
  messages: [],
})

describe('buildPrescriptionSummary', () => {
  it('builds a concise copyable CRRT summary', () => {
    const text = buildPrescriptionSummary({
      inputRows: [
        { label: '体重', value: '70 kg' },
        { label: 'CRRT / CBP 模式', value: 'CVVHDF' },
        { label: '目标治疗剂量', value: '25 mL/kg/h' },
      ],
      fluid: {
        status: 'ready',
        targetEffluentMlH: 1750,
        clearanceFluidMlH: 1650,
        replacementFlowMlH: 825,
        dialysateFlowMlH: 825,
        netUfMlH: 100,
        messages: [],
      },
      anticoagulation: {
        status: 'ready',
        title: '枸橼酸抗凝',
        rows: [{ label: '初始枸橼酸泵速', value: '172.1 mL/h' }],
        messages: [],
      },
      electrolytes: {
        calcium: emptyElectrolyte('葡萄糖酸钙'),
        bicarbonate: emptyElectrolyte('NaHCO₃（碳酸氢钠）'),
        potassium: emptyElectrolyte('KCl（氯化钾）'),
      },
      validationIssues: [],
    })

    expect(text).toContain('CRRT / CBP 处方参数计算摘要')
    expect(text).toContain('体重：70 kg')
    expect(text).toContain('置换液速度：825 mL/h')
    expect(text).toContain('透析液速度：825 mL/h')
    expect(text).toContain('初始枸橼酸泵速：172.1 mL/h')
  })

  it('includes warnings in the review section', () => {
    const text = buildPrescriptionSummary({
      inputRows: [],
      fluid: {
        status: 'incomplete',
        netUfMlH: 0,
        messages: [],
      },
      anticoagulation: {
        status: 'idle',
        title: '抗凝计算',
        rows: [],
        messages: [],
      },
      electrolytes: {
        calcium: emptyElectrolyte('葡萄糖酸钙'),
        bicarbonate: emptyElectrolyte('NaHCO₃（碳酸氢钠）'),
        potassium: emptyElectrolyte('KCl（氯化钾）'),
      },
      validationIssues: [
        {
          id: 'example.warning',
          severity: 'warning',
          title: '需要核对',
          message: '示例提醒',
        },
      ],
    })

    expect(text).toContain('【需核对】')
    expect(text).toContain('需要核对：示例提醒')
  })
})
