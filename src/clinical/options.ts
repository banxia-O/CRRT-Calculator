import type { Option } from '../flow/types'

export const otherOption: Option = { value: '__other__', label: '其他' }

export const modeOptions: Option[] = [
  { value: 'cvvh', label: 'CVVH' },
  { value: 'cvvhd', label: 'CVVHD' },
  { value: 'cvvhdf', label: 'CVVHDF' },
  { value: 'scuf', label: 'SCUF' },
  otherOption,
]

export const fluidAllocationOptions: Option[] = [
  { value: 'by_mode', label: '按治疗模式分配' },
  { value: 'one_to_one', label: '置换液 : 透析液 = 1 : 1' },
  { value: 'custom_ratio', label: '自定义比例' },
  otherOption,
]

export const anticoagulationOptions: Option[] = [
  { value: 'none', label: '无抗凝' },
  { value: 'citrate', label: '枸橼酸' },
  { value: 'heparin', label: '普通肝素' },
  otherOption,
]

export const citratePreparationOptions: Option[] = [
  {
    value: 'trisodium_citrate_4pct',
    label: '4% 枸橼酸钠',
    meta: { concentrationPercent: 4 },
  },
  { value: 'acid_citrate_dextrose', label: '枸橼酸复方制剂' },
  otherOption,
]

export const calciumGluconatePreparationOptions: Option[] = [
  {
    value: 'calcium_gluconate_10pct',
    label: '10% 葡萄糖酸钙',
    meta: { concentrationPercent: 10 },
  },
  otherOption,
]

export const bicarbonatePreparationOptions: Option[] = [
  {
    value: 'sodium_bicarbonate_1_4pct',
    label: '1.4% NaHCO₃',
    meta: { concentrationPercent: 1.4 },
  },
  {
    value: 'sodium_bicarbonate_5pct',
    label: '5% NaHCO₃',
    meta: { concentrationPercent: 5 },
  },
  {
    value: 'sodium_bicarbonate_8_4pct',
    label: '8.4% NaHCO₃',
    meta: { concentrationPercent: 8.4 },
  },
  otherOption,
]

export const potassiumChloridePreparationOptions: Option[] = [
  {
    value: 'potassium_chloride_10pct',
    label: '10% KCl',
    meta: { concentrationPercent: 10 },
  },
  {
    value: 'potassium_chloride_15pct',
    label: '15% KCl',
    meta: { concentrationPercent: 15 },
  },
  otherOption,
]
