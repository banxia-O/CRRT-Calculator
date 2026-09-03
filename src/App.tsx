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
import { buildPrescriptionSummary } from './output/prescription'
import {
  validatePrescription,
  type ValidationIssue,
  type ValidationSeverity,
} from './validation/prescription'

const severityRank: Record<ValidationSeverity, number> = {
  error: 3,
  warning: 2,
  info: 1,
}

const navigationSteps = [
  ...steps.map((step) => ({ id: step.id, title: step.title })),
  { id: 'result', title: '结果' },
]

function strongestSeverity(issues: ValidationIssue[]) {
  return issues.reduce<ValidationSeverity | undefined>((current, issue) => {
    if (!current || severityRank[issue.severity] > severityRank[current]) {
      return issue.severity
    }
    return current
  }, undefined)
}

function FieldIssues({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null

  return (
    <div className="field-validation-list">
      {issues.map((issue) => (
        <div className={`field-validation ${issue.severity}`} key={issue.id}>
          {issue.message}
        </div>
      ))}
    </div>
  )
}

function Field({
  field,
  value,
  otherValue,
  issues,
  onChange,
  onOtherChange,
}: {
  field: FieldConfig
  value: string | number | undefined
  otherValue?: string
  issues: ValidationIssue[]
  onChange: (value: string | number | undefined) => void
  onOtherChange: (value: string) => void
}) {
  const severity = strongestSeverity(issues)
  const blockClass = `field-block ${severity ? `has-${severity}` : ''}`

  if (field.type === 'single') {
    return (
      <div className={blockClass}>
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
        <FieldIssues issues={issues} />
      </div>
    )
  }

  return (
    <label className={blockClass}>
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
      <FieldIssues issues={issues} />
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

function ValidationPanel({
  issues,
  errorCount,
  warningCount,
  hasAnyInput,
}: {
  issues: ValidationIssue[]
  errorCount: number
  warningCount: number
  hasAnyInput: boolean
}) {
  return (
    <div className="validation-panel">
      <div className="validation-heading">
        <strong>临床校验</strong>
        <div className="validation-counts">
          {errorCount > 0 && <span className="validation-badge error">错误 {errorCount}</span>}
          {warningCount > 0 && (
            <span className="validation-badge warning">提醒 {warningCount}</span>
          )}
        </div>
      </div>

      {!hasAnyInput ? (
        <div className="validation-ok muted">开始录入后自动检查缺项、冲突和明显异常输入。</div>
      ) : issues.length === 0 ? (
        <div className="validation-ok">当前未发现已接入规则中的冲突。</div>
      ) : (
        <div className="validation-issues">
          {issues.map((issue) => (
            <div className={`validation-issue ${issue.severity}`} key={issue.id}>
              <div className="validation-issue-title">{issue.title}</div>
              <div className="validation-issue-message">{issue.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

async function copyTextWithFallback(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // file:// 或医院浏览器可能不开放 Clipboard API，继续走离线兼容回退。
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

export default function App() {
  const [stepIndex, setStepIndex] = useState(0)
  const [state, setState] = useState<FormState>({})
  const [otherValues, setOtherValues] = useState<Record<string, string>>({})
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const isResultStep = stepIndex === steps.length
  const step = isResultStep ? undefined : steps[stepIndex]
  const fields = step ? visibleFields(step.fields, state) : []

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

  const validationResult = useMemo(
    () => validatePrescription(state, otherValues),
    [state, otherValues],
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

  const hasAnyInput = Object.values(state).some((value) => value !== undefined && value !== '')
  const hasFluidInputs = Boolean(state.weight || state.targetDose || state.mode)
  const hasAnticoagulationInput = Boolean(state.anticoagulation)
  const hasElectrolyteInputs = Boolean(
    state.anticoagulation === 'citrate' ||
      state.bicarbonateBaseMmolL !== undefined ||
      state.bicarbonateTargetMmolL !== undefined ||
      state.bicarbonateCarrierFlowMlH !== undefined ||
      state.potassiumBaseMmolL !== undefined ||
      state.potassiumTargetMmolL !== undefined ||
      state.potassiumBagVolumeL !== undefined,
  )

  const prescriptionText = useMemo(
    () =>
      buildPrescriptionSummary({
        inputRows: summary.map(({ label, value }) => ({ label, value })),
        fluid: fluidResult,
        anticoagulation: anticoagulationResult,
        electrolytes: electrolyteResult,
        validationIssues: validationResult.issues,
      }),
    [summary, fluidResult, anticoagulationResult, electrolyteResult, validationResult.issues],
  )

  const hasCoreInputs =
    typeof state.weight === 'number' &&
    state.weight > 0 &&
    typeof state.targetDose === 'number' &&
    state.targetDose > 0 &&
    typeof state.mode === 'string'
  const canCopy =
    hasCoreInputs &&
    !validationResult.hasErrors &&
    fluidResult.status === 'ready'

  const clearAll = () => {
    setState({})
    setOtherValues({})
    setStepIndex(0)
    setCopyState('idle')
  }

  const updateField = (fieldId: string, value: string | number | undefined) => {
    setCopyState('idle')
    setState((current) => ({ ...current, [fieldId]: value }))
  }

  const updateOther = (fieldId: string, value: string) => {
    setCopyState('idle')
    setOtherValues((current) => ({ ...current, [fieldId]: value }))
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <div className="eyebrow">CRRT / CBP</div>
          <h1>透析处方计算器 · Phase 6</h1>
          <p>液体量、抗凝、电解质 / 缓冲液、实时校验与最终处方摘要已串成完整主流程。</p>
        </div>
        <span className="demo-badge">OFFLINE READY</span>
      </header>

      <div className="stepper" aria-label="步骤">
        {navigationSteps.map((item, index) => (
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

      {isResultStep ? (
        <div className="final-workspace">
          <section className="card final-card">
            <div className="final-heading">
              <div>
                <div className="step-count">FINAL RESULT</div>
                <h2>处方参数摘要</h2>
                <p className="step-description">核对结果后可复制文本，粘贴到院内允许使用的位置。</p>
              </div>
              <div
                className={`final-status ${
                  validationResult.hasErrors
                    ? 'error'
                    : validationResult.warnings.length > 0
                      ? 'warning'
                      : canCopy
                        ? 'ready'
                        : 'muted'
                }`}
              >
                {validationResult.hasErrors
                  ? `存在错误 ${validationResult.errors.length}`
                  : validationResult.warnings.length > 0
                    ? `需核对 ${validationResult.warnings.length}`
                    : canCopy
                      ? '可复制'
                      : '尚未完成'}
              </div>
            </div>

            <ValidationPanel
              issues={validationResult.issues}
              errorCount={validationResult.errors.length}
              warningCount={validationResult.warnings.length}
              hasAnyInput={hasAnyInput}
            />

            {!hasAnyInput ? (
              <div className="empty-state">还没有录入参数。返回前面的步骤开始填写即可。</div>
            ) : (
              <>
                <div className="final-grid">
                  <div>
                    <div className="result-section-title">液体量</div>
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
                    </div>
                  </div>

                  <div>
                    <div className="result-section-title">抗凝</div>
                    {hasAnticoagulationInput ? (
                      <div className="calculation-panel">
                        <div className="calculation-caption">{anticoagulationResult.title}</div>
                        {anticoagulationResult.rows.map((row) => (
                          <ResultRow
                            key={`${row.label}-${row.value}`}
                            label={row.label}
                            value={row.value}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state compact">未选择抗凝，按选填项留空。</div>
                    )}
                  </div>
                </div>

                <div className="result-section-title">电解质 / 缓冲液</div>
                {hasElectrolyteInputs ? (
                  <div className="final-grid three">
                    <ComponentResultBlock result={electrolyteResult.calcium} />
                    <ComponentResultBlock result={electrolyteResult.bicarbonate} />
                    <ComponentResultBlock result={electrolyteResult.potassium} />
                  </div>
                ) : (
                  <div className="empty-state compact">未启用补钙、补碱或补钾计算，按选填项留空。</div>
                )}

                <div className="result-section-title">可复制文本</div>
                <pre className="copy-preview">{prescriptionText}</pre>

                {!canCopy && (
                  <div className="copy-blocked-note">
                    {validationResult.hasErrors
                      ? '当前存在 Error 级校验问题，修正后才能复制处方摘要。'
                      : '请先完成体重、治疗模式、目标治疗剂量和液体量主流程，再复制摘要。'}
                  </div>
                )}
              </>
            )}

            <div className="final-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setStepIndex(Math.max(0, steps.length - 1))}
              >
                返回修改
              </button>
              <button type="button" className="secondary-button" onClick={clearAll}>
                清空重算
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!canCopy}
                onClick={async () => {
                  const copied = await copyTextWithFallback(prescriptionText)
                  setCopyState(copied ? 'copied' : 'failed')
                }}
              >
                {copyState === 'copied'
                  ? '已复制'
                  : copyState === 'failed'
                    ? '复制失败'
                    : '复制处方摘要'}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="workspace">
          <section className="card form-card">
            <div className="card-heading">
              <div>
                <div className="step-count">STEP {stepIndex + 1} / {steps.length}</div>
                <h2>{step?.title}</h2>
              </div>
            </div>

            {step?.description && <p className="step-description">{step.description}</p>}

            <div className="fields">
              {fields.map((field) => (
                <Field
                  key={field.id}
                  field={field}
                  value={state[field.id]}
                  otherValue={otherValues[field.id]}
                  issues={validationResult.byField[field.id] ?? []}
                  onChange={(value) => updateField(field.id, value)}
                  onOtherChange={(value) => updateOther(field.id, value)}
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
                onClick={() => setStepIndex((index) => Math.min(steps.length, index + 1))}
              >
                {stepIndex === steps.length - 1 ? '查看结果' : '下一步'}
              </button>
            </div>
          </section>

          <aside className="card summary-card">
            <div className="summary-title-row">
              <div>
                <div className="step-count">REAL-TIME</div>
                <h2>计算结果</h2>
              </div>
              <button type="button" className="text-button" onClick={clearAll}>
                清空
              </button>
            </div>

            <ValidationPanel
              issues={validationResult.issues}
              errorCount={validationResult.errors.length}
              warningCount={validationResult.warnings.length}
              hasAnyInput={hasAnyInput}
            />

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
              <div className="empty-state compact">抗凝为选填；选择后显示对应计算。</div>
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
              <div className="empty-state compact">补钙、补碱和补钾均为按需计算。</div>
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
              Phase 6 继续把医学目标留给临床医生；页面负责换算、校验和整理成可复制的处方参数摘要。
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}
