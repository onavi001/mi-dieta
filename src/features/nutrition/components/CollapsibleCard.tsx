type CollapsibleCardProps = {
  title: string
  stepNumber: number
  isExpanded: boolean
  onToggle: () => void
  isDisabled?: boolean
  isComplete?: boolean
  children: React.ReactNode
}

export function CollapsibleCard({
  title,
  stepNumber,
  isExpanded,
  onToggle,
  isDisabled = false,
  isComplete = false,
  children,
}: CollapsibleCardProps) {
  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${isDisabled ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={isDisabled}
        className={`w-full flex items-center justify-between p-4 ${isDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              isComplete ? 'bg-emerald-100 text-emerald-700' : isExpanded ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {isComplete ? '✓' : stepNumber}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {isDisabled && <p className="text-[10px] text-gray-500">Completa el paso anterior para continuar</p>}
          </div>
        </div>
        <span className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isExpanded && <div className="border-t border-gray-200 p-4 space-y-3">{children}</div>}
    </div>
  )
}
