'use client'

import { useActionState, useMemo, useRef, useState } from 'react'
import { saveContactAction } from '@/app/admin/actions/appearance'
import type { FormState } from '@/app/admin/actions/products'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Form'
import type { Contact } from '@/lib/products-store'
import { buildWhatsAppMessage, DEFAULT_WHATSAPP_MESSAGE } from '@/lib/whatsapp'

type ContactFormProps = {
  contacts: Contact[]
  whatsappMessage: string
}

/**
 * Codigos automaticos que se pueden usar dentro del mensaje predeterminado.
 * Se reemplazan con la informacion del producto que esta consultando el
 * cliente al generar el link de WhatsApp. El campo `example` se usa solo
 * en el panel para mostrarle al admin un valor realista.
 */
const PLACEHOLDERS = [
  {
    token: '{productName}',
    label: 'nombre del producto',
    example: 'Camiseta Argentina 2026',
  },
  {
    token: '{size}',
    label: 'talle que eligio el cliente',
    example: 'M',
  },
  {
    token: '{price}',
    label: 'precio del producto',
    example: '$45.000',
  },
  {
    token: '{productId}',
    label: 'codigo interno del producto',
    example: 'arg-2026',
  },
] as const

/**
 * Formulario de contacto: edita la lista de personas que atienden por
 * WhatsApp y la plantilla del mensaje que reciben las consultas.
 *
 * El primer contacto de la lista es el "principal": aparece en los botones
 * de la tienda (header, hero, ficha de producto). El resto se lista en el
 * footer como alternativas.
 *
 * La plantilla del mensaje admite codigos automaticos (`{productName}`,
 * `{size}`, `{price}`, `{productId}`) que se reemplazan con los datos del
 * producto al generar el link. La vista previa muestra como se ve el
 * mensaje con datos de muestra y los chips de la leyenda son clickeables
 * para insertar el codigo donde esta el cursor.
 */
export function ContactForm({ contacts: initialContacts, whatsappMessage }: ContactFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveContactAction,
    {},
  )
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [message, setMessage] = useState(whatsappMessage || DEFAULT_WHATSAPP_MESSAGE)
  const messageRef = useRef<HTMLTextAreaElement | null>(null)

  // Muestra como queda el mensaje con datos de muestra. Asi el admin ve
  // el efecto real de los codigos sin tener que abrir un producto.
  const preview = useMemo(
    () =>
      buildWhatsAppMessage(
        {
          productName: 'Camiseta Argentina 2026',
          size: 'M',
          price: 45000,
          productId: 'arg-2026',
        },
        message,
      ),
    [message],
  )

  const isUsingDefault = message.trim() === DEFAULT_WHATSAPP_MESSAGE.trim()

  function updateContact(index: number, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index))
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: '', number: '' }])
  }

  /**
   * Inserta un codigo automatico en la posicion del cursor del textarea.
   * Si el textarea no esta enfocado todavia, lo agrega al final. Despues
   * de insertar, devuelve el cursor a la derecha del codigo y mantiene
   * el foco.
   */
  function insertPlaceholder(token: string) {
    const textarea = messageRef.current
    if (!textarea) {
      setMessage((prev) => prev + token)
      return
    }
    const start = textarea.selectionStart ?? message.length
    const end = textarea.selectionEnd ?? message.length
    const next = message.slice(0, start) + token + message.slice(end)
    setMessage(next)
    const caret = start + token.length
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(caret, caret)
    })
  }

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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Contactos de WhatsApp</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Lista de personas que atienden por WhatsApp. El primero es el principal: aparece
              en los botones de la tienda. Todos se muestran en el footer.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
            {contacts.length} {contacts.length === 1 ? 'contacto' : 'contactos'}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {contacts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-zinc-700">
                Todavia no hay contactos cargados.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Agrega uno abajo para empezar a recibir consultas.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {contacts.map((contact, index) => (
                <li key={index}>
                  <ContactRow
                    index={index}
                    contact={contact}
                    isPrimary={index === 0}
                    onChange={updateContact}
                    onRemove={removeContact}
                  />
                </li>
              ))}
            </ul>
          )}

          <div>
            <Button type="button" variant="outline" size="md" onClick={addContact}>
              + Agregar contacto
            </Button>
          </div>
        </div>

        <input type="hidden" name="contact_numbers" value={JSON.stringify(contacts)} />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Mensaje predeterminado</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Es el texto que se abre en el chat de WhatsApp cuando un cliente toca
              &ldquo;Consultar&rdquo;. Escribilo como quieras: los datos automaticos se completan
              solos con la informacion del producto.
            </p>
          </div>
          {message.trim() !== '' && !isUsingDefault ? (
            <button
              type="button"
              onClick={() => setMessage(DEFAULT_WHATSAPP_MESSAGE)}
              className="shrink-0 text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
            >
              Restablecer
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4">
          <Field htmlFor="whatsapp_message" label="Plantilla del mensaje">
            <Textarea
              id="whatsapp_message"
              name="whatsapp_message"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              ref={messageRef}
              className="font-mono text-[13px] leading-relaxed"
              spellCheck={false}
            />
          </Field>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Datos automaticos que se pueden usar
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Toca un codigo para insertarlo donde esta el cursor. Despues se reemplaza
              solo con la informacion del producto que esta consultando el cliente.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PLACEHOLDERS.map((placeholder) => (
                <li key={placeholder.token}>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder(placeholder.token)}
                    className="group flex w-full items-start gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-zinc-950 hover:bg-white"
                  >
                    <code className="mt-0.5 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700 group-hover:bg-zinc-50">
                      {placeholder.token}
                    </code>
                    <span className="min-w-0 text-[11px] leading-snug text-zinc-600">
                      <span className="block font-medium text-zinc-700">
                        {placeholder.label}
                      </span>
                      <span className="block text-zinc-500">ej: {placeholder.example}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-zinc-500">
              Si una linea del mensaje queda vacia (por ejemplo, si el producto no tiene
              talle cargado), esa linea no se envia.
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Vista previa
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Asi llega al chat con un producto de ejemplo (Camiseta Argentina 2026, talle
              M, $45.000).
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-800">
              {preview || (
                <span className="text-zinc-400">
                  (La plantilla no produce texto con los datos de muestra. Revisa los
                  codigos automaticos.)
                </span>
              )}
            </p>
          </div>
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

/**
 * Fila individual de contacto: dos campos lado a lado (nombre + numero) y
 * un boton ghost para eliminar la fila. En la primera fila se anade una
 * pequena insignia "Principal" para reforzar quien se usa como CTA.
 */
type ContactRowProps = {
  index: number
  contact: Contact
  isPrimary: boolean
  onChange: (index: number, patch: Partial<Contact>) => void
  onRemove: (index: number) => void
}

function ContactRow({ index, contact, isPrimary, onChange, onRemove }: ContactRowProps) {
  const nameId = `contact_name_${index}`
  const numberId = `contact_number_${index}`

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
      {isPrimary ? (
        <div className="mb-2 flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-zinc-950" aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
            Contacto principal
          </span>
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field htmlFor={nameId} label="Nombre" hint="Como se muestra en el sitio.">
          <Input
            id={nameId}
            type="text"
            value={contact.name}
            onChange={(e) => onChange(index, { name: e.target.value })}
            placeholder="Juan"
            autoComplete="off"
          />
        </Field>

        <Field
          htmlFor={numberId}
          label="Numero"
          hint="Formato internacional sin + ni espacios."
        >
          <Input
            id={numberId}
            type="tel"
            value={contact.number}
            onChange={(e) => onChange(index, { number: e.target.value })}
            placeholder="5491123456789"
            autoComplete="off"
          />
        </Field>

        <div className="flex sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label={`Eliminar contacto ${contact.name || index + 1}`}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  )
}