import { describe, expect, it } from 'vitest'
import { calculateElectrolytes } from './electrolytes'

describe('calculateElectrolytes', () => {
  it('calculates initial 10% calcium gluconate rate for calcium-free RCA', () => {
    const result = calculateElectrolytes({
      anticoagulationMethod: 'citrate',
      targetEffluentMlH: 2000,
      calciumFluidType: 'calcium_free',
      calciumGluconatePreparation: 'calcium_gluconate_10pct',
    })

    expect(result.calcium.status).toBe('ready')
    expect(result.calcium.rows).toContainEqual({
      label: '10% 葡萄糖酸钙初始速度',
      value: '16 mL/h',
    })
  })

  it('calculates bicarbonate pump rate from target fluid concentration', () => {
    const result = calculateElectrolytes({
      bicarbonatePreparation: 'sodium_bicarbonate_5pct',
      bicarbonateBaseMmolL: 0,
      bicarbonateTargetMmolL: 30,
      bicarbonateCarrierFlowMlH: 1000,
    })

    expect(result.bicarbonate.status).toBe('ready')
    expect(result.bicarbonate.rows).toEqual(
      expect.arrayContaining([
        { label: '补碱需求', value: '30 mmol/h' },
        { label: 'NaHCO₃ 泵速', value: '50.4 mL/h' },
      ]),
    )
  })

  it('calculates 10% KCl volume per 4 L bag', () => {
    const result = calculateElectrolytes({
      potassiumChloridePreparation: 'potassium_chloride_10pct',
      potassiumBaseMmolL: 0,
      potassiumTargetMmolL: 2,
      potassiumBagVolumeL: 4,
    })

    expect(result.potassium.status).toBe('ready')
    expect(result.potassium.rows).toContainEqual({
      label: 'KCl 加入量',
      value: '6 mL/袋',
    })
  })

  it('does not calculate negative potassium addition', () => {
    const result = calculateElectrolytes({
      potassiumChloridePreparation: 'potassium_chloride_10pct',
      potassiumBaseMmolL: 4,
      potassiumTargetMmolL: 2,
      potassiumBagVolumeL: 4,
    })

    expect(result.potassium.status).toBe('invalid')
  })

  it('warns when a hyperkalemia target exceeds the 2026 guideline range', () => {
    const result = calculateElectrolytes({
      potassiumContext: 'hyperkalemia',
      potassiumChloridePreparation: 'potassium_chloride_10pct',
      potassiumBaseMmolL: 0,
      potassiumTargetMmolL: 3,
      potassiumBagVolumeL: 4,
    })

    expect(result.potassium.messages.join(' ')).toContain('0–2 mmol/L')
  })
})
