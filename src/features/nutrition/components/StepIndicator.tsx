type StepIndicatorProps = {
  currentStep: number
  totalSteps: number
  stepLabel: string
  onStepClick?: (step: number) => void
  isStepEnabled?: (step: number) => boolean
  onBlockedStepClick?: (step: number) => void
}

export function StepIndicator({
  currentStep,
  totalSteps,
  stepLabel,
  onStepClick,
  isStepEnabled,
  onBlockedStepClick,
}: StepIndicatorProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-600 uppercase">Progreso</p>
        <span className="text-xs font-bold text-emerald-600">
          {currentStep}/{totalSteps}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {Array.from({ length: totalSteps }, (_, idx) => {
          const step = idx + 1
          const enabled = isStepEnabled ? isStepEnabled(step) : true
          const isActive = step === currentStep
          return (
            <button
              key={step}
              type="button"
              onClick={() => {
                if (!enabled) {
                  onBlockedStepClick?.(step)
                  return
                }
                onStepClick?.(step)
              }}
              aria-disabled={!enabled}
              className={`min-h-8 rounded-lg border text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : enabled
                    ? 'bg-white text-gray-700 border-gray-300 active:bg-gray-100'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              Paso {step}
            </button>
          )
        })}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-emerald-600 h-2 rounded-full transition-all"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-500 mt-2">{stepLabel}</p>
    </div>
  )
}
