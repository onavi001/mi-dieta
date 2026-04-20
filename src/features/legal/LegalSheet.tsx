import { API_ORIGIN_PUBLIC, CONTACT_EMAIL, SITE_ORIGIN, contactMailtoHref } from '@/constants/contact'

export type LegalView = 'privacy' | 'terms' | 'contact'

export function LegalSheet(props: { view: LegalView | null; onClose: () => void }) {
  const { view, onClose } = props
  if (!view) return null

  const titles: Record<LegalView, string> = {
    privacy: 'Privacidad',
    terms: 'Términos de uso',
    contact: 'Contacto y soporte',
  }

  return (
    <div
      className="fixed inset-0 z-[300] bg-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-sheet-title"
    >
      <header className="shrink-0 sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white/95 backdrop-blur px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          ← Volver
        </button>
        <h2 id="legal-sheet-title" className="text-sm font-semibold text-gray-900">
          {titles[view]}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-10">
        <div className="max-w-prose mx-auto text-sm text-gray-700 space-y-4 leading-relaxed">
          {view === 'privacy' && <PrivacyBody />}
          {view === 'terms' && <TermsBody />}
          {view === 'contact' && <ContactBody />}
        </div>
      </div>
    </div>
  )
}

function PrivacyBody() {
  return (
    <>
      <p className="text-xs text-gray-500">Última actualización: abril de 2026</p>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">1. Responsable</h3>
        <p>
          El responsable del tratamiento de los datos personales asociados al servicio web <strong>Mi Dieta</strong>{' '}
          ({SITE_ORIGIN}) es quien administra la aplicación y el backend asociado ({API_ORIGIN_PUBLIC}). Para ejercer
          tus derechos o resolver dudas sobre privacidad, utiliza el correo indicado en la sección{' '}
          <strong>Contacto y soporte</strong> (o configura <code className="text-xs bg-gray-100 px-1 rounded">VITE_CONTACT_EMAIL</code>{' '}
          / el correo en el código según corresponda).
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">2. Datos que tratamos</h3>
        <p>Según uses la aplicación, podemos tratar, entre otros:</p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>Datos de cuenta e identificación (por ejemplo correo electrónico, nombre, identificador de usuario).</li>
          <li>Datos de perfil nutricional y de planificación (porciones, distribución por comida, objetivos).</li>
          <li>Datos de uso del servicio (planes semanales, comidas asignadas, lista de super, preferencias guardadas).</li>
          <li>Datos técnicos habituales (tokens de sesión gestionados por el proveedor de autenticación).</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">3. Finalidad</h3>
        <p>
          Gestionar el registro e inicio de sesión, prestar las funcionalidades de planificación de comidas, nutrición y
          lista de super, y mantener la seguridad del servicio. No vendemos tus datos personales a terceros.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">4. Proveedores (encargados)</h3>
        <p>
          El servicio puede depender de proveedores como alojamiento del frontend (por ejemplo Netlify), del API (por
          ejemplo Render) y de base de datos / autenticación (por ejemplo Supabase). Esos proveedores tratan datos según
          sus propias políticas y como encargados del tratamiento en la medida en que resulte aplicable.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">5. Conservación</h3>
        <p>
          Conservamos la información mientras mantengas tu cuenta activa y sea necesaria para la finalidad indicada,
          salvo obligación legal de conservación distinta.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">6. Tus derechos</h3>
        <p>
          Según tu jurisdicción, puedes tener derecho a acceder, rectificar, suprimir, oponerte, limitar el tratamiento o
          solicitar la portabilidad de tus datos. Para ejercerlos, contacta mediante el correo de soporte cuando esté
          configurado.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">7. Menores</h3>
        <p>
          El servicio no está dirigido a menores de edad sin el consentimiento o supervisión de quien ejerce la
          patria potestad o tutela, según corresponda.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">8. Cambios</h3>
        <p>
          Podemos actualizar esta política. La fecha de actualización figurará al inicio. El uso continuado del servicio
          tras los cambios implica la aceptación de la política revisada cuando así lo exija la ley aplicable.
        </p>
      </section>
    </>
  )
}

function TermsBody() {
  return (
    <>
      <p className="text-xs text-gray-500">Última actualización: abril de 2026</p>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">1. Naturaleza del servicio</h3>
        <p>
          <strong>Mi Dieta</strong> ({SITE_ORIGIN}) es una herramienta de organización de comidas y lista de compras.{' '}
          <strong>No sustituye el consejo médico, nutricional ni dietético personalizado.</strong> Ante dudas de salud,
          consulta a un profesional cualificado.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">2. Cuenta y uso</h3>
        <p>
          Te comprometes a proporcionar datos veraces cuando sea necesario y a mantener la confidencialidad de tus
          credenciales. El uso indebido del servicio (accesos no autorizados, intentos de vulnerar la seguridad, uso
          automatizado abusivo, etc.) puede conllevar la suspensión del acceso.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">3. Disponibilidad</h3>
        <p>
          Procuramos que el servicio esté disponible, pero no garantizamos un funcionamiento ininterrumpido ni libre de
          errores. Pueden producirse cortes por mantenimiento o causas ajenas al control razonable.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">4. Limitación de responsabilidad</h3>
        <p>
          En la medida permitida por la ley aplicable, el servicio se ofrece «tal cual». No nos hacemos responsables de
          decisiones de salud o alimentación tomadas únicamente en base a la aplicación, ni de daños indirectos o
          lucro cesante derivados del uso del servicio.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">5. Contenido y compartición</h3>
        <p>
          Las funciones de compartir plan con otros usuarios dependen de la configuración de la aplicación y de la
          aceptación de invitaciones. Eres responsable de con quién compartes acceso.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">6. Modificaciones</h3>
        <p>
          Podemos modificar estas condiciones o el servicio. Publicaremos la fecha de actualización en este documento.
          El uso continuado puede implicar la aceptación de los cambios cuando la ley lo requiera.
        </p>
      </section>
      <section className="space-y-2">
        <h3 className="text-base font-semibold text-gray-900">7. Ley aplicable</h3>
        <p>
          En lo no regulado por normas imperativas, se aplicará la legislación que corresponda según el responsable del
          servicio y la jurisdicción aplicable a cada caso.
        </p>
      </section>
    </>
  )
}

function ContactBody() {
  return (
    <>
      <section className="space-y-2">
        
      </section>
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Correo de contacto y soporte</h3>
        {CONTACT_EMAIL ? (
          <>
            <p>
              Para consultas sobre privacidad, incidencias técnicas o sugerencias, escribe a:
            </p>
            <p>
              <a href={contactMailtoHref()} className="text-base font-medium text-emerald-700 underline break-all">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-xs text-gray-500">
              Intentamos responder en un plazo razonable; el tiempo exacto puede variar según carga y tipo de consulta.
            </p>
          </>
        ) : (
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            El correo de contacto aún no está configurado. Si administras esta instalación, define la variable{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">VITE_CONTACT_EMAIL</code> en Netlify o edita{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">LOCAL_CONTACT_EMAIL</code> en{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">src/constants/contact.ts</code>.
          </p>
        )}
      </section>
    </>
  )
}
