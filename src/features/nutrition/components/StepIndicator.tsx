type StepIndicatorProps = {
  currentStep: number
  totalSteps: number
  stepLabel: string
}

export function StepIndicator({ currentStep, totalSteps, stepLabel }: StepIndicatorProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-600 uppercase">Progreso</p>
        <span className="text-xs font-bold text-emerald-600">
          {currentStep}/{totalSteps}
        </span>
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
