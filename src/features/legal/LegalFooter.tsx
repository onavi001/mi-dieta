import type { LegalView } from './LegalSheet'

export function LegalFooter(props: { onOpen: (view: LegalView) => void; className?: string }) {
  const { onOpen, className = '' } = props
  const link = 'text-[11px] text-gray-500 hover:text-emerald-700 underline underline-offset-2'

  return (
    <div className={`text-center flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 ${className}`}>
      <button type="button" className={link} onClick={() => onOpen('privacy')}>
        Privacidad
      </button>
      <span className="text-[11px] text-gray-300" aria-hidden>
        ·
      </span>
      <button type="button" className={link} onClick={() => onOpen('terms')}>
        Términos
      </button>
      <span className="text-[11px] text-gray-300" aria-hidden>
        ·
      </span>
      <button type="button" className={link} onClick={() => onOpen('contact')}>
        Contacto
      </button>
    </div>
  )
}
