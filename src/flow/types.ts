export type FormValue = string | number | undefined
export type FormState = Record<string, FormValue>

export type OptionMeta = Record<string, string | number | boolean>

export type Option = {
  value: string
  label: string
  meta?: OptionMeta
}

export type VisibilityRule =
  | { field: string; operator: 'equals'; value: string }
  | { field: string; operator: 'in'; values: string[] }
  | { operator: 'all'; rules: VisibilityRule[] }
  | { operator: 'any'; rules: VisibilityRule[] }

export type FieldConfig = {
  id: string
  label: string
  type: 'single' | 'number' | 'text'
  options?: Option[]
  unit?: string
  placeholder?: string
  helpText?: string
  allowOther?: boolean
  visibleIf?: VisibilityRule
  purpose?: 'calculation' | 'context'
}

export type StepConfig = {
  id: string
  title: string
  description?: string
  fields: FieldConfig[]
}
