'use client'

import { useActionState, useState } from 'react'
import { saveFooterAction } from '@/app/admin/actions/footer'
import type { FormState } from '@/app/admin/actions/products'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Form'

/**
 * Formulario del footer del sitio: edita la descripcion debajo del logo,
 * los datos de contacto (email + Instagram) y la linea de copyright.
 *
 * Antes tenia una tarjeta "Links de navegacion" para editar la columna de
 * navegacion del pie; esa columna se elimino del sitio publico, asi que
 * tambien se elimino su edicion aca.
 */
type FooterFormProps = {
  initial: {
    description: string
    email: string
    instagramUrl: string
    copyright: string
  }
}

/**
 * El copyright admite los placeholders `{year}` (anio actual) y `{name}`
 * (nombre de la tienda) que la vista publica reemplaza en runtime.
 */
export function FooterForm({ initial }: FooterFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveFooterAction,
    {},
  )
  const [description, setDescription] = useState(initial.description)
  const [email, setEmail] = useState(initial.email)
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl)
  const [copyright, setCopyright] = useState(initial.copyright)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Descripcion</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Texto que se ve debajo del logo en el footer.
        </p>
        <div className="mt-4">
          <Textarea
            id="footer_description"
            name="footer_description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dos lineas breves que resumen la tienda."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Contacto del footer</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Como te puede escribir un visitante desde el pie de la tienda.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field htmlFor="footer_email" label="Email" hint="Se muestra como link mailto:.">
            <Input
              id="footer_email"
              name="footer_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hola@tienda.com"
              autoComplete="off"
            />
          </Field>

          <Field
            htmlFor="footer_instagram_url"
            label="Instagram"
            hint="URL completa del perfil."
          >
            <Input
              id="footer_instagram_url"
              name="footer_instagram_url"
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/..."
              autoComplete="off"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Copyright</h2>
        <div className="mt-4">
          <Field
            htmlFor="footer_copyright"
            label="Linea de copyright"
            hint={
              <span>
                Podes usar{' '}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700">
                  {'{year}'}
                </code>{' '}
                (se reemplaza con el anio actual) y{' '}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700">
                  {'{name}'}
                </code>{' '}
                (con el nombre de la tienda) como placeholders.
              </span>
            }
          >
            <Input
              id="footer_copyright"
              name="footer_copyright"
              type="text"
              value={copyright}
              onChange={(e) => setCopyright(e.target.value)}
              placeholder="© {year} {name}. Catalogo informativo."
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar footer'}
        </Button>
      </div>
    </form>
  )
}
