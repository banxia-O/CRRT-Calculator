import type { StepConfig } from '../flow/types'

const other = { value: '__other__', label: '其他' }

export const steps: StepConfig[] = [
  {
    id: 'basic',
    title: '基础信息',
    description: 'Demo 只保留最少输入，后续再按临床需要扩充。',
    fields: [
      { id: 'weight', label: '体重', type: 'number', unit: 'kg', placeholder: '例如 70' },
    ],
  },
  {
    id: 'indication',
    title: '适应症',
    fields: [
      {
        id: 'indication',
        label: '主要适应症',
        type: 'single',
        allowOther: true,
        options: [
          { value: 'aki', label: '急性肾损伤' },
          { value: 'fluid', label: '容量管理' },
          { value: 'electrolyte', label: '电解质 / 酸碱紊乱' },
          other,
        ],
      },
    ],
  },
  {
    id: 'mode',
    title: '治疗方式',
    fields: [
      {
        id: 'mode',
        label: 'CRRT / CBP 模式',
        type: 'single',
        allowOther: true,
        options: [
          { value: 'cvvh', label: 'CVVH' },
          { value: 'cvvhd', label: 'CVVHD' },
          { value: 'cvvhdf', label: 'CVVHDF' },
          other,
        ],
      },
    ],
  },
  {
    id: 'device',
    title: '设备配置',
    fields: [
      {
        id: 'machine',
        label: '机型',
        type: 'single',
        allowOther: true,
        options: [
          { value: 'prismaflex', label: 'Prismaflex' },
          { value: 'multiFiltrate', label: 'multiFiltrate' },
          other,
        ],
      },
      {
        id: 'access',
        label: '血管通路',
        type: 'single',
        allowOther: true,
        options: [
          { value: 'ijv', label: '颈内静脉' },
          { value: 'femoral', label: '股静脉' },
          other,
        ],
      },
    ],
  },
  {
    id: 'anticoagulation',
    title: '抗凝',
    fields: [
      {
        id: 'anticoagulation',
        label: '抗凝方式',
        type: 'single',
        allowOther: true,
        options: [
          { value: 'none', label: '无抗凝' },
          { value: 'heparin', label: '肝素' },
          { value: 'citrate', label: '枸橼酸' },
          other,
        ],
      },
      {
        id: 'citrateRate',
        label: '枸橼酸速度',
        type: 'number',
        unit: 'mL/h',
        visibleIf: { field: 'anticoagulation', operator: 'equals', value: 'citrate' },
      },
    ],
  },
  {
    id: 'parameters',
    title: '治疗参数',
    fields: [
      { id: 'bloodFlow', label: '血流量', type: 'number', unit: 'mL/min' },
      {
        id: 'replacementFlow',
        label: '置换液速度',
        type: 'number',
        unit: 'mL/h',
        visibleIf: { field: 'mode', operator: 'in', values: ['cvvh', 'cvvhdf'] },
      },
      {
        id: 'dialysateFlow',
        label: '透析液速度',
        type: 'number',
        unit: 'mL/h',
        visibleIf: { field: 'mode', operator: 'in', values: ['cvvhd', 'cvvhdf'] },
      },
      { id: 'netUf', label: '净超滤速度', type: 'number', unit: 'mL/h' },
    ],
  },
]
