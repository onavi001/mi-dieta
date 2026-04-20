type FieldShellProps = {
  id: string
  label: string
  helper?: string
  children: React.ReactNode
  className?: string
}

export function FieldShell({ id, label, helper, children, className = '' }: FieldShellProps) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <label htmlFor={id} className="block text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
        {label}
      </label>
      {children}
      {helper && <p className="text-[10px] text-gray-500">{helper}</p>}
    </div>
  )
}
