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

export const replacementPositionOptions: Option[] = [
  { value: 'pre', label: '前稀释' },
  { value: 'post', label: '后稀释' },
  { value: 'mixed', label: '前 + 后稀释' },
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
    meta: { concentrationPercent: 4, citrateMmolL: 136 },
  },
  {
    value: 'citrate_replacement_0_5pct',
    label: '0.5% 枸橼酸盐置换液',
    meta: { concentrationPercent: 0.5 },
  },
  otherOption,
]

export const calciumFluidTypeOptions: Option[] = [
  { value: 'calcium_free', label: '无钙置换液 / 透析液' },
  { value: 'calcium_containing', label: '含钙置换液 / 透析液' },
  otherOption,
]

export const calciumGluconatePreparationOptions: Option[] = [
  {
    value: 'calcium_gluconate_10pct',
    label: '10% 葡萄糖酸钙',
    meta: { concentrationPercent: 10, calciumMmolMl: 0.224 },
  },
  otherOption,
]

export const bicarbonatePreparationOptions: Option[] = [
  {
    value: 'sodium_bicarbonate_1_4pct',
    label: '1.4% NaHCO₃',
    meta: { concentrationPercent: 1.4, bicarbonateMmolMl: 0.1667 },
  },
  {
    value: 'sodium_bicarbonate_5pct',
    label: '5% NaHCO₃',
    meta: { concentrationPercent: 5, bicarbonateMmolMl: 0.5952 },
  },
  {
    value: 'sodium_bicarbonate_8_4pct',
    label: '8.4% NaHCO₃',
    meta: { concentrationPercent: 8.4, bicarbonateMmolMl: 1 },
  },
  otherOption,
]

export const potassiumContextOptions: Option[] = [
  { value: 'hyperkalemia', label: '高钾血症' },
  { value: 'other_context', label: '其他 / 常规调整' },
  otherOption,
]

export const potassiumChloridePreparationOptions: Option[] = [
  {
    value: 'potassium_chloride_10pct',
    label: '10% KCl',
    meta: { concentrationPercent: 10, potassiumMmolMl: 1.341 },
  },
  {
    value: 'potassium_chloride_15pct',
    label: '15% KCl',
    meta: { concentrationPercent: 15, potassiumMmolMl: 2.012 },
  },
  otherOption,
]
