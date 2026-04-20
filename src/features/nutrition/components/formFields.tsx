import { FieldShell } from './FieldShell'

type InputFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  helper?: string
  className?: string
}

export function InputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  helper,
  className,
}: InputFieldProps) {
  return (
    <FieldShell id={id} label={label} helper={helper} className={className}>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-2 text-xs"
      />
    </FieldShell>
  )
}

type TextareaFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helper?: string
}

export function TextareaField({ id, label, value, onChange, placeholder, helper }: TextareaFieldProps) {
  return (
    <FieldShell id={id} label={label} helper={helper}>
      <textarea
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-2 text-xs min-h-16"
      />
    </FieldShell>
  )
}

type SelectFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  helper?: string
  children: React.ReactNode
}

export function SelectField({ id, label, value, onChange, helper, children }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} helper={helper}>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border rounded-xl px-3 py-2 text-xs"
      >
        {children}
      </select>
    </FieldShell>
  )
}
