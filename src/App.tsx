import { useMemo, useState } from 'react'
import { steps } from './clinical/config'
import { visibleFields } from './flow/engine'
import type { FieldConfig, FormState } from './flow/types'

function Field({
  field,
  value,
  otherValue,
  onChange,
  onOtherChange,
}: {
  field: FieldConfig
  value: string | number | undefined
  otherValue?: string
  onChange: (value: string | number | undefined) => void
  onOtherChange: (value: string) => void
}) {
  if (field.type === 'single') {
    return (
      <div className="field-block">
        <div className="field-label">{field.label}</div>
        <div className="option-grid">
          {field.options?.map((option) => (
            <button
              type="button"
              className={`option ${value === option.value ? 'selected' : ''}`}
              key={option.value}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {field.allowOther && value === '__other__' && (
          <input
            className="text-input other-input"
            value={otherValue ?? ''}
            placeholder={`请输入其他${field.label}`}
            onChange={(event) => onOtherChange(event.target.value)}
          />
        )}
      </div>
    )
  }

  return (
    <label className="field-block">
      <span className="field-label">{field.label}</span>
      <div className="input-with-unit">
        <input
          className="text-input"
          type={field.type === 'number' ? 'number' : 'text'}
          value={value ?? ''}
          placeholder={field.placeholder}
          onChange={(event) => {
            if (event.target.value === '') {
              onChange(undefined)
              return
            }
            onChange(field.type === 'number' ? Number(event.target.value) : event.target.value)
          }}
        />
        {field.unit && <span className="unit">{field.unit}</span>}
      </div>
    </label>
  )
}

export default function App() {
  const [stepIndex, setStepIndex] = useState(0)
  const [state, setState] = useState<FormState>({})
  const [otherValues, setOtherValues] = useState<Record<string, string>>({})

  const step = steps[stepIndex]
  const fields = visibleFields(step.fields, state)

  const summary = useMemo(() => {
    const allVisibleFields = steps.flatMap((item) => visibleFields(item.fields, state))
    const visibleIds = new Set(allVisibleFields.map((field) => field.id))
    const labels = new Map(allVisibleFields.map((field) => [field.id, field.label]))
    const optionLabels = new Map(
      allVisibleFields.map((field) => [
        field.id,
        new Map(field.options?.map((option) => [option.value, option.label]) ?? []),
      ]),
    )

    return Object.entries(state)
      .filter(([key, value]) => visibleIds.has(key) && value !== '' && value !== undefined)
      .map(([key, value]) => {
        const displayValue =
          value === '__other__'
            ? otherValues[key] || '其他（未填写）'
            : optionLabels.get(key)?.get(String(value)) ?? String(value)

        return {
          key,
          label: labels.get(key) ?? key,
          value: displayValue,
        }
      })
  }, [state, otherValues])

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <div className="eyebrow">CRRT / CBP</div>
          <h1>透析处方计算器 · Demo</h1>
          <p>先验证流程和分支。当前医学选项只用于占位，后续再系统核对。</p>
        </div>
        <span className="demo-badge">DEMO</span>
      </header>

      <div className="stepper" aria-label="步骤">
        {steps.map((item, index) => (
          <button
            type="button"
            key={item.id}
            className={`step-chip ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
            onClick={() => setStepIndex(index)}
          >
            <span>{index + 1}</span>
            {item.title}
          </button>
        ))}
      </div>

      <div className="workspace">
        <section className="card form-card">
          <div className="card-heading">
            <div>
              <div className="step-count">STEP {stepIndex + 1} / {steps.length}</div>
              <h2>{step.title}</h2>
            </div>
          </div>

          {step.description && <p className="step-description">{step.description}</p>}

          <div className="fields">
            {fields.map((field) => (
              <Field
                key={field.id}
                field={field}
                value={state[field.id]}
                otherValue={otherValues[field.id]}
                onChange={(value) =>
                  setState((current) => ({ ...current, [field.id]: value }))
                }
                onOtherChange={(value) =>
                  setOtherValues((current) => ({ ...current, [field.id]: value }))
                }
              />
            ))}
          </div>

          <div className="nav-row">
            <button
              type="button"
              className="secondary-button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
            >
              上一步
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={stepIndex === steps.length - 1}
              onClick={() => setStepIndex((index) => Math.min(steps.length - 1, index + 1))}
            >
              下一步
            </button>
          </div>
        </section>

        <aside className="card summary-card">
          <div className="summary-title-row">
            <div>
              <div className="step-count">REAL-TIME</div>
              <h2>当前处方摘要</h2>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setState({})
                setOtherValues({})
                setStepIndex(0)
              }}
            >
              清空
            </button>
          </div>

          {summary.length === 0 ? (
            <div className="empty-state">左侧开始选择后，这里会实时汇总。</div>
          ) : (
            <dl className="summary-list">
              {summary.map((item) => (
                <div key={item.key} className="summary-item">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="summary-note">
            Demo 暂不输出治疗建议。后续会把临床规则、公式和 UI 分开维护。
          </div>
        </aside>
      </div>
    </main>
  )
}
