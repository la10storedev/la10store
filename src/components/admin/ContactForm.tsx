'use client'

import { useActionState } from 'react'
import { saveContactAction } from '@/app/admin/actions/appearance'
import type { FormState } from '@/app/admin/actions/products'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'

type ContactFormProps = {
  whatsappNumber: string
}

/**
 * Formulario de contacto: edita el numero de WhatsApp que recibe las
 * consultas de la tienda.
 */
export function ContactForm({ whatsappNumber }: ContactFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveContactAction,
    {},
  )

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
        <h2 className="text-sm font-semibold text-zinc-900">WhatsApp</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Numero que reciben las consultas de la tienda. Se muestra en el header, footer, hero y
          boton de compra de cada producto.
        </p>

        <div className="mt-4">
          <Field
            htmlFor="whatsapp_number"
            label="Numero de WhatsApp"
            hint="Formato internacional sin + ni espacios. Ej: 5491123456789"
          >
            <Input
              id="whatsapp_number"
              name="whatsapp_number"
              type="tel"
              placeholder="5491123456789"
              defaultValue={whatsappNumber}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar contacto'}
        </Button>
      </div>
    </form>
  )
}
