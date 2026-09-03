import { describe, expect, it } from 'vitest'
import { calculateAnticoagulation } from './anticoagulation'

describe('calculateAnticoagulation', () => {
  it('calculates 4% citrate pump range for 130 mL/min blood flow', () => {
    const result = calculateAnticoagulation({
      method: 'citrate',
      bloodFlowMlMin: 130,
      citratePreparation: 'trisodium_citrate_4pct',
    })

    expect(result.status).toBe('ready')
    expect(result.rows).toEqual(
      expect.arrayContaining([
        { label: '3 mmol/L 对应泵速', value: '172.1 mL/h' },
        { label: '4 mmol/L 对应泵速', value: '229.4 mL/h' },
      ]),
    )
  })

  it('calculates an exact citrate rate when target is supplied', () => {
    const result = calculateAnticoagulation({
      method: 'citrate',
      bloodFlowMlMin: 120,
      citratePreparation: 'trisodium_citrate_4pct',
      citrateTargetMmolL: 3,
    })

    expect(result.rows).toContainEqual({
      label: '初始枸橼酸泵速',
      value: '158.8 mL/h',
    })
  })

  it('calculates heparin loading and maintenance ranges', () => {
    const result = calculateAnticoagulation({
      method: 'heparin',
      weightKg: 70,
      heparinConcentrationIuMl: 500,
    })

    expect(result.status).toBe('ready')
    expect(result.rows).toEqual(
      expect.arrayContaining([
        { label: '首剂范围', value: '350–1050 IU' },
        { label: '维持剂量范围', value: '350–700 IU/h' },
        { label: '维持泵速范围', value: '0.7–1.4 mL/h' },
      ]),
    )
  })

  it('does not reuse the 4% citrate formula for 0.5% citrate replacement fluid', () => {
    const result = calculateAnticoagulation({
      method: 'citrate',
      bloodFlowMlMin: 130,
      citratePreparation: 'citrate_replacement_0_5pct',
    })

    expect(result.status).toBe('unsupported')
  })
})
