'use client'

import { useActionState, useState } from 'react'
import { saveShippingAction } from '@/app/admin/actions/shipping'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import type { ShippingIcon, ShippingItem } from '@/lib/products-store'

/**
 * Formulario de la seccion "Envio y pagos" del sitio publico.
 *
 * - El admin edita el titulo de la seccion y la lista de items (titulo,
 *   descripcion, icono).
 * - Los items se serializan en un hidden input `shipping_items` como JSON
 *   para enviarlos en un solo FormData al server action.
 * - El server action vive en `src/app/admin/actions/shipping.ts` (lo crea
 *   el equipo de datos) y persiste los cambios en `site_settings`.
 */
type ShippingFormProps = {
  initial: {
    title: string
    items: ShippingItem[]
  }
}

/** Opciones del selector de icono (lucide-react). */
const ICON_OPTIONS: { value: ShippingIcon; label: string }[] = [
  { value: 'truck', label: 'Camión' },
  { value: 'package', label: 'Paquete' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'wallet', label: 'Billetera virtual' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'moto', label: 'Moto' },
  { value: 'store', label: 'Retiro en local' },
  { value: 'map-pin', label: 'Cobertura' },
  { value: 'clock', label: 'Tiempos' },
  { value: 'repeat', label: 'Cambios' },
  { value: 'shield', label: 'Protección' },
  { value: 'percent', label: 'Descuento' },
  { value: 'chat', label: 'Chat' },
]

export function ShippingForm({ initial }: ShippingFormProps) {
  const [state, formAction, pending] = useActionState<{ error?: string }, FormData>(
    saveShippingAction,
    {},
  )

  const [title, setTitle] = useState(initial.title)
  const [items, setItems] = useState<ShippingItem[]>(initial.items)

  function updateItem(index: number, patch: Partial<ShippingItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function addItem() {
    setItems((prev) => [...prev, { title: '', body: '', icon: 'truck' }])
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {/* Hidden inputs: payload para el server action. */}
      <input type="hidden" name="shipping_title" value={title} />
      <input type="hidden" name="shipping_items" value={JSON.stringify(items)} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Título de la sección</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Heading que se ve arriba de los items en la portada.
        </p>
        <div className="mt-4">
          <Field htmlFor="shipping_title_input" label="Título">
            <Input
              id="shipping_title_input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Envío y pagos"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Items</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Cada item es una columna con icono, titulo y bajada. Tres es lo
              que entra bien en la grilla de la portada; podes agregar mas.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-zinc-700">
                Todavia no hay items.
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Agrega uno abajo: pensá en envio, medios de pago y como comprar.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item, index) => (
                <li key={index}>
                  <ItemRow
                    index={index}
                    item={item}
                    onChange={updateItem}
                    onRemove={removeItem}
                  />
                </li>
              ))}
            </ul>
          )}

          <div>
            <Button type="button" variant="outline" size="md" onClick={addItem}>
              + Agregar item
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar envíos y pagos'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Fila individual de item: dos campos apilados (titulo + bajada) y la
 * columna derecha con selector de icono + boton eliminar. En mobile la fila
 * se apila; en desktop usa una grilla 1fr_1fr_auto.
 */
type ItemRowProps = {
  index: number
  item: ShippingItem
  onChange: (index: number, patch: Partial<ShippingItem>) => void
  onRemove: (index: number) => void
}

function ItemRow({ index, item, onChange, onRemove }: ItemRowProps) {
  const titleId = `shipping_item_title_${index}`
  const bodyId = `shipping_item_body_${index}`
  const iconId = `shipping_item_icon_${index}`

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field htmlFor={titleId} label="Título" hint="Encabezado de la columna.">
          <Input
            id={titleId}
            type="text"
            value={item.title}
            onChange={(e) => onChange(index, { title: e.target.value })}
            placeholder="Envíos a todo el país"
            autoComplete="off"
          />
        </Field>

        <Field htmlFor={iconId} label="Icono" hint="El que aparece arriba del titulo.">
          <Select
            id={iconId}
            value={item.icon}
            onChange={(e) => onChange(index, { icon: e.target.value as ShippingIcon })}
          >
            {ICON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label={`Eliminar item ${item.title || index + 1}`}
          >
            Eliminar
          </Button>
        </div>

        <div className="sm:col-span-3">
          <Field htmlFor={bodyId} label="Bajada" hint="Una o dos frases debajo del titulo.">
            <Textarea
              id={bodyId}
              rows={2}
              value={item.body}
              onChange={(e) => onChange(index, { body: e.target.value })}
              placeholder="Describí brevemente la politica o el paso."
            />
          </Field>
        </div>
      </div>
    </div>
  )
}
