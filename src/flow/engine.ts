import type { FieldConfig, FormState, VisibilityRule } from './types'

function matches(rule: VisibilityRule, state: FormState): boolean {
  if (rule.operator === 'all') {
    return rule.rules.every((child) => matches(child, state))
  }

  if (rule.operator === 'any') {
    return rule.rules.some((child) => matches(child, state))
  }

  const current = state[rule.field]

  if (rule.operator === 'equals') {
    return current === rule.value
  }

  return rule.values.includes(String(current ?? ''))
}

export function isFieldVisible(field: FieldConfig, state: FormState) {
  return field.visibleIf ? matches(field.visibleIf, state) : true
}

export function visibleFields(fields: FieldConfig[], state: FormState) {
  return fields.filter((field) => isFieldVisible(field, state))
}
