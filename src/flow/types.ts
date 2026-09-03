export type FormValue = string | number | undefined
export type FormState = Record<string, FormValue>

export type Option = {
  value: string
  label: string
}

export type VisibilityRule =
  | { field: string; operator: 'equals'; value: string }
  | { field: string; operator: 'in'; values: string[] }

export type FieldConfig = {
  id: string
  label: string
  type: 'single' | 'number' | 'text'
  options?: Option[]
  unit?: string
  placeholder?: string
  allowOther?: boolean
  visibleIf?: VisibilityRule
}

export type StepConfig = {
  id: string
  title: string
  description?: string
  fields: FieldConfig[]
}
