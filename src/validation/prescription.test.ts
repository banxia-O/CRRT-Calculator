import { describe, expect, it } from 'vitest'
import { validatePrescription } from './prescription'

describe('validatePrescription', () => {
  it('flags mathematically invalid core inputs', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvh',
      netUf: 2000,
    })

    expect(result.errors.map((issue) => issue.id)).toContain(
      'fluid.netUf.exceeds_effluent',
    )
  })

  it('checks CVVHDF custom ratios', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvhdf',
      fluidAllocation: 'custom_ratio',
      replacementShare: 70,
      dialysateShare: 40,
    })

    expect(result.errors.map((issue) => issue.id)).toContain(
      'fluid.cvvhdf.ratio_not_100',
    )
  })

  it('requires citrate inputs and warns outside the traditional initial range', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvhd',
      anticoagulation: 'citrate',
      citratePreparation: 'trisodium_citrate_4pct',
      citrateTarget: 4.5,
    })

    const warningIds = result.warnings.map((issue) => issue.id)
    expect(warningIds).toContain('citrate.bloodFlow.missing')
    expect(warningIds).toContain('citrate.target.outside_initial_range')
    expect(warningIds).toContain('citrate.calcium_fluid_type.missing')
  })

  it('does not require bicarbonate details when only a preparation is recorded', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvhd',
      bicarbonatePreparation: 'sodium_bicarbonate_1_4pct',
    })

    expect(result.issues.map((issue) => issue.id)).not.toContain(
      'bicarbonate.carrier.missing',
    )
  })

  it('does not require potassium details when only context and preparation are recorded', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvhd',
      potassiumContext: 'hyperkalemia',
      potassiumChloridePreparation: 'potassium_chloride_10pct',
    })

    expect(result.issues.map((issue) => issue.id)).not.toContain(
      'potassium.bag_volume.missing',
    )
  })

  it('flags a potassium target below the base fluid concentration', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvhd',
      potassiumContext: 'routine',
      potassiumChloridePreparation: 'potassium_chloride_10pct',
      potassiumBaseMmolL: 2,
      potassiumTargetMmolL: 1,
      potassiumBagVolumeL: 4,
    })

    expect(result.errors.map((issue) => issue.id)).toContain(
      'potassium.target_below_base',
    )
  })

  it('warns when a hyperkalemia target is above 2 mmol/L', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvhd',
      potassiumContext: 'hyperkalemia',
      potassiumChloridePreparation: 'potassium_chloride_10pct',
      potassiumBaseMmolL: 0,
      potassiumTargetMmolL: 3,
      potassiumBagVolumeL: 4,
    })

    expect(result.warnings.map((issue) => issue.id)).toContain(
      'potassium.hyperkalemia.target_above_guideline_range',
    )
  })

  it('does not validate stale CVVHDF ratio fields after switching modes', () => {
    const result = validatePrescription({
      weight: 70,
      targetDose: 25,
      mode: 'cvvh',
      replacementShare: 80,
      dialysateShare: 80,
    })

    expect(result.issues.map((issue) => issue.id)).not.toContain(
      'fluid.cvvhdf.ratio_not_100',
    )
  })

  it('asks for free text when a visible other branch is selected', () => {
    const result = validatePrescription(
      {
        weight: 70,
        targetDose: 25,
        mode: '__other__',
      },
      {},
    )

    expect(result.warnings.map((issue) => issue.id)).toContain(
      'other.mode.missing_text',
    )
  })
})
