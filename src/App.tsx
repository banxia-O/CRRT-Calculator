import { useMemo, useState } from 'react'
import { calculateAnticoagulation } from './calculators/anticoagulation'
import {
  calculateElectrolytes,
  type ComponentCalculationResult,
} from './calculators/electrolytes'
import { calculateFluidPrescription } from './calculators/fluid'
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

        {field.helpText && <div className="help-text">{field.helpText}</div>}
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
      {field.helpText && <div className="help-text">{field.helpText}</div>}
    </label>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ComponentResultBlock({ result }: { result: ComponentCalculationResult }) {
  if (result.status === 'idle') return null

  return (
    <div className="calculation-panel">
      <div className="calculation-caption">{result.title}</div>
      {result.rows.map((row) => (
        <ResultRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
      ))}
      {result.messages.map((message) => (
        <div
          className={`result-message ${result.status === 'invalid' ? 'error' : ''}`}
          key={message}
        >
          {message}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [stepIndex, setStepIndex] = useState(0)
  const [state, setState] = useState<FormState>({})
  const [otherValues, setOtherValues] = useState<Record<string, string>>({})

  const step = steps[stepIndex]
  const fields = visibleFields(step.fields, state)

  const fluidResult = useMemo(
    () =>
      calculateFluidPrescription({
        weightKg: typeof state.weight === 'number' ? state.weight : undefined,
        targetDoseMlKgH: typeof state.targetDose === 'number' ? state.targetDose : undefined,
        mode: typeof state.mode === 'string' ? state.mode : undefined,
        fluidAllocation:
          typeof state.fluidAllocation === 'string' ? state.fluidAllocation : undefined,
        replacementSharePct:
          typeof state.replacementShare === 'number' ? state.replacementShare : undefined,
        dialysateSharePct:
          typeof state.dialysateShare === 'number' ? state.dialysateShare : undefined,
        netUfMlH: typeof state.netUf === 'number' ? state.netUf : undefined,
        replacementPosition:
          typeof state.replacementPosition === 'string' ? state.replacementPosition : undefined,
      }),
    [state],
  )

  const anticoagulationResult = useMemo(
    () =>
      calculateAnticoagulation({
        method:
          typeof state.anticoagulation === 'string' ? state.anticoagulation : undefined,
        weightKg: typeof state.weight === 'number' ? state.weight : undefined,
        bloodFlowMlMin:
          typeof state.bloodFlow === 'number' ? state.bloodFlow : undefined,
        citratePreparation:
          typeof state.citratePreparation === 'string'
            ? state.citratePreparation
            : undefined,
        citrateCustomMmolL:
          typeof state.citrateCustomMmolL === 'number'
            ? state.citrateCustomMmolL
            : undefined,
        citrateTargetMmolL:
          typeof state.citrateTarget === 'number' ? state.citrateTarget : undefined,
        heparinConcentrationIuMl:
          typeof state.heparinConcentration === 'number'
            ? state.heparinConcentration
            : undefined,
      }),
    [state],
  )

  const electrolyteResult = useMemo(
    () =>
      calculateElectrolytes({
        anticoagulationMethod:
          typeof state.anticoagulation === 'string' ? state.anticoagulation : undefined,
        mode: typeof state.mode === 'string' ? state.mode : undefined,
        replacementPosition:
          typeof state.replacementPosition === 'string' ? state.replacementPosition : undefined,
        targetEffluentMlH: fluidResult.targetEffluentMlH,
        calciumFluidType:
          typeof state.calciumFluidType === 'string' ? state.calciumFluidType : undefined,
        calciumGluconatePreparation:
          typeof state.calciumGluconatePreparation === 'string'
            ? state.calciumGluconatePreparation
            : undefined,
        bicarbonatePreparation:
          typeof state.bicarbonatePreparation === 'string'
            ? state.bicarbonatePreparation
            : undefined,
        bicarbonateCustomMmolMl:
          typeof state.bicarbonateCustomMmolMl === 'number'
            ? state.bicarbonateCustomMmolMl
            : undefined,
        bicarbonateBaseMmolL:
          typeof state.bicarbonateBaseMmolL === 'number'
            ? state.bicarbonateBaseMmolL
            : undefined,
        bicarbonateTargetMmolL:
          typeof state.bicarbonateTargetMmolL === 'number'
            ? state.bicarbonateTargetMmolL
            : undefined,
        bicarbonateCarrierFlowMlH:
          typeof state.bicarbonateCarrierFlowMlH === 'number'
            ? state.bicarbonateCarrierFlowMlH
            : undefined,
        potassiumContext:
          typeof state.potassiumContext === 'string' ? state.potassiumContext : undefined,
        potassiumChloridePreparation:
          typeof state.potassiumChloridePreparation === 'string'
            ? state.potassiumChloridePreparation
            : undefined,
        potassiumCustomMmolMl:
          typeof state.potassiumCustomMmolMl === 'number'
            ? state.potassiumCustomMmolMl
            : undefined,
        potassiumBaseMmolL:
          typeof state.potassiumBaseMmolL === 'number'
            ? state.potassiumBaseMmolL
            : undefined,
        potassiumTargetMmolL:
          typeof state.potassiumTargetMmolL === 'number'
            ? state.potassiumTargetMmolL
            : undefined,
        potassiumBagVolumeL:
          typeof state.potassiumBagVolumeL === 'number'
            ? state.potassiumBagVolumeL
            : undefined,
      }),
    [state, fluidResult.targetEffluentMlH],
  )

  const summary = useMemo(() => {
    const allVisibleFields = steps.flatMap((item) => visibleFields(item.fields, state))
    const visibleIds = new Set(allVisibleFields.map((field) => field.id))
    const fieldsById = new Map(allVisibleFields.map((field) => [field.id, field]))
    const optionLabels = new Map(
      allVisibleFields.map((field) => [
        field.id,
        new Map(field.options?.map((option) => [option.value, option.label]) ?? []),
      ]),
    )

    return Object.entries(state)
      .filter(([key, value]) => visibleIds.has(key) && value !== '' && value !== undefined)
      .map(([key, value]) => {
        const field = fieldsById.get(key)
        const rawDisplayValue =
          value === '__other__'
            ? otherValues[key] || '其他（未填写）'
            : optionLabels.get(key)?.get(String(value)) ?? String(value)
        const displayValue =
          typeof value === 'number' && field?.unit
            ? `${rawDisplayValue} ${field.unit}`
            : rawDisplayValue

        return {
          key,
          label: field?.label ?? key,
          value: displayValue,
        }
      })
  }, [state, otherValues])

  const hasFluidInputs = Boolean(state.weight || state.targetDose || state.mode)
  const hasAnticoagulationInput = Boolean(state.anticoagulation)
  const hasElectrolyteInputs = Boolean(
    state.anticoagulation === 'citrate' ||
      state.bicarbonatePreparation ||
      state.bicarbonateBaseMmolL !== undefined ||
      state.bicarbonateTargetMmolL !== undefined ||
      state.potassiumChloridePreparation ||
      state.potassiumBaseMmolL !== undefined ||
      state.potassiumTargetMmolL !== undefined,
  )

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <div className="eyebrow">CRRT / CBP</div>
          <h1>透析处方计算器 · Phase 4</h1>
          <p>已接入液体量、抗凝、葡萄糖酸钙、NaHCO₃ 与 KCl 换算。</p>
        </div>
        <span className="demo-badge">OFFLINE READY</span>
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
              <h2>计算结果</h2>
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

          <div className="result-section-title">液体量</div>
          {!hasFluidInputs ? (
            <div className="empty-state compact">录入体重、模式和目标治疗剂量后开始计算。</div>
          ) : (
            <div className="calculation-panel">
              {fluidResult.targetEffluentMlH !== undefined && (
                <ResultRow
                  label="目标总流出液量"
                  value={`${fluidResult.targetEffluentMlH} mL/h`}
                />
              )}
              {fluidResult.clearanceFluidMlH !== undefined && (
                <ResultRow
                  label="置换液 + 透析液"
                  value={`${fluidResult.clearanceFluidMlH} mL/h`}
                />
              )}
              {fluidResult.replacementFlowMlH !== undefined && (
                <ResultRow
                  label="置换液速度"
                  value={`${fluidResult.replacementFlowMlH} mL/h`}
                />
              )}
              {fluidResult.dialysateFlowMlH !== undefined && (
                <ResultRow
                  label="透析液速度"
                  value={`${fluidResult.dialysateFlowMlH} mL/h`}
                />
              )}
              <ResultRow label="净超滤速度" value={`${fluidResult.netUfMlH} mL/h`} />

              {fluidResult.messages.map((message) => (
                <div
                  className={`result-message ${fluidResult.status === 'invalid' ? 'error' : ''}`}
                  key={message}
                >
                  {message}
                </div>
              ))}
            </div>
          )}

          <div className="result-section-title">抗凝</div>
          {!hasAnticoagulationInput ? (
            <div className="empty-state compact">选择抗凝方式后显示对应计算。</div>
          ) : (
            <div className="calculation-panel">
              <div className="calculation-caption">{anticoagulationResult.title}</div>
              {anticoagulationResult.rows.map((row) => (
                <ResultRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
              ))}
              {anticoagulationResult.messages.map((message) => (
                <div
                  className={`result-message ${anticoagulationResult.status === 'invalid' ? 'error' : ''}`}
                  key={message}
                >
                  {message}
                </div>
              ))}
            </div>
          )}

          <div className="result-section-title">电解质 / 缓冲液</div>
          {!hasElectrolyteInputs ? (
            <div className="empty-state compact">填写补钙、补碱或补钾参数后显示对应换算。</div>
          ) : (
            <>
              <ComponentResultBlock result={electrolyteResult.calcium} />
              <ComponentResultBlock result={electrolyteResult.bicarbonate} />
              <ComponentResultBlock result={electrolyteResult.potassium} />
            </>
          )}

          {summary.length > 0 && (
            <>
              <div className="summary-divider" />
              <div className="step-count">CURRENT INPUTS</div>
              <dl className="summary-list">
                {summary.map((item) => (
                  <div key={item.key} className="summary-item">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <div className="summary-note">
            Phase 4 只自动计算指南明确支持的初始公式或纯配液换算。NaHCO₃ 与 KCl 的目标处方液浓度由医生根据实时酸碱、电解质状态设定；RCA 补钙必须继续按体内 iCa 动态调整。
          </div>
        </aside>
      </div>
    </main>
  )
}
