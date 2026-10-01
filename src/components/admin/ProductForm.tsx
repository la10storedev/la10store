'use client'

import { useActionState, useRef, useState } from 'react'
import { saveProductAction, type FormState } from '@/app/admin/actions/products'
import { ProductImage } from '@/components/products/ProductImage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Toast } from '@/components/ui/Toast'
import { formatPrice } from '@/lib/format'
import { SIZE_ORDER } from '@/lib/products'
import type { Product, ProductCategory, ProductDraft, ProductSize, Taxonomy } from '@/types/product'
import { ChevronDown } from 'lucide-react'

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL']

const DEFAULT_COLORS = { primary: '#16a34a', secondary: '#ffffff' }

function emptyDraft(): ProductDraft {
  return {
    name: '',
    team: '',
    category: 'seleccion',
    league: '',
    season: '',
    description: '',
    price: 0,
    images: [],
    sizes: DEFAULT_SIZES.map((size) => ({ size, stock: 5 })),
    colors: DEFAULT_COLORS,
    featured: false,
    visible: true,
  }
}

function toDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    team: product.team,
    category: product.category,
    league: product.league,
    season: product.season,
    description: product.description,
    price: product.price,
    images: product.images,
    sizes: product.sizes,
    colors: product.colors,
    featured: product.featured,
    visible: product.visible,
  }
}

type ProductFormProps = {
  product?: Product
  /** Equipos y ligas/competiciones disponibles, separados por categoría. */
  taxonomy: Taxonomy
  justSaved?: boolean
}

export function ProductForm({ product, taxonomy, justSaved = false }: ProductFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveProductAction, {})
  const [draft, setDraft] = useState<ProductDraft>(() =>
    product ? toDraft(product) : emptyDraft(),
  )
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showSavedToast, setShowSavedToast] = useState(justSaved)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const errors = state.fieldErrors ?? {}
  const isSeleccion = draft.category === 'seleccion'

  function set<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function setSize(index: number, patch: Partial<ProductSize>) {
    setDraft((current) => ({
      ...current,
      sizes: current.sizes.map((size, i) => (i === index ? { ...size, ...patch } : size)),
    }))
  }

  function moveImage(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const target = index + direction
      if (target < 0 || target >= current.images.length) return current
      const images = [...current.images]
      ;[images[index], images[target]] = [images[target], images[index]]
      return { ...current, images }
    })
  }

  function handleCategoryChange(category: ProductCategory) {
    setDraft((current) => ({
      ...current,
      category,
      // Equipo y competición se conservan solo si pertenecen a la nueva categoría.
      team: taxonomy[category].teams.includes(current.team) ? current.team : '',
      league: taxonomy[category].leagues.includes(current.league) ? current.league : '',
    }))
  }

  async function uploadFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Error al subir la imagen')
    const data = await res.json()
    return data.url as string
  }

  async function handleFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    setUploading(true)
    try {
      const urls = await Promise.all(imageFiles.map(uploadFile))
      set('images', [...draft.images.filter(Boolean), ...urls])
    } catch {
      // silently fail — el usuario puede reintentar
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.files
    if (items && items.length > 0) {
      e.preventDefault()
      handleFiles(items)
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={product?.id ?? ''} />
      <input type="hidden" name="payload" value={JSON.stringify(draft)} />

      {showSavedToast ? (
        <Toast message="Cambios guardados" type="success" onClose={() => setShowSavedToast(false)} />
      ) : null}

      {state.error && !state.fieldErrors ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Section title="Datos básicos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                htmlFor="name"
                label="Nombre"
                error={errors.name}
                hint="Es lo que se lee en la tarjeta del catalogo."
                className="sm:col-span-2"
              >
                <Input
                  id="name"
                  name="name"
                  value={draft.name}
                  onChange={(event) => set('name', event.target.value)}
                  placeholder="Argentina 2022 · Campeon del Mundo"
                  invalid={Boolean(errors.name)}
                />
              </Field>

              <Field
                htmlFor="team"
                label="Equipo o selección"
                error={errors.team}
                hint="Elegí uno de la lista o agregá uno nuevo."
              >
                <SelectWithAdd
                  id="team"
                  value={draft.team}
                  options={taxonomy[draft.category].teams}
                  placeholder="Argentina"
                  addLabel="Agregar equipo"
                  invalid={Boolean(errors.team)}
                  onChange={(value) => set('team', value)}
                />
              </Field>

              <Field htmlFor="category" label="Tipo" error={errors.category}>
                <div className="flex gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      draft.category === 'seleccion'
                        ? 'border-brand-300 bg-brand-50 text-brand-800 ring-1 ring-brand-200'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value="seleccion"
                      checked={draft.category === 'seleccion'}
                      onChange={() => handleCategoryChange('seleccion')}
                      className="sr-only"
                    />
                    Selección
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      draft.category === 'club'
                        ? 'border-brand-300 bg-brand-50 text-brand-800 ring-1 ring-brand-200'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value="club"
                      checked={draft.category === 'club'}
                      onChange={() => handleCategoryChange('club')}
                      className="sr-only"
                    />
                    Club
                  </label>
                </div>
              </Field>

              <Field
                htmlFor="league"
                label="Liga o torneo"
                error={errors.league}
                hint="Competiciones de la categoría elegida."
              >
                <SelectWithAdd
                  id="league"
                  value={draft.league}
                  options={taxonomy[draft.category].leagues}
                  placeholder={isSeleccion ? 'Mundial FIFA' : 'Liga Profesional'}
                  addLabel="Agregar liga"
                  invalid={Boolean(errors.league)}
                  onChange={(value) => set('league', value)}
                />
              </Field>

              <Field htmlFor="season" label="Temporada" error={errors.season}>
                <Input
                  id="season"
                  name="season"
                  value={draft.season}
                  onChange={(event) => set('season', event.target.value)}
                  placeholder="2024"
                  invalid={Boolean(errors.season)}
                />
              </Field>

              <Field
                htmlFor="price"
                label="Precio de referencia (ARS)"
                error={errors.price}
                hint="No se cobra online: ordena la consulta."
              >
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="15000"
                  value={draft.price === 0 ? '' : draft.price}
                  onChange={(event) => set('price', Math.max(0, Number(event.target.value) || 0))}
                  invalid={Boolean(errors.price)}
                />
              </Field>

              <Field
                htmlFor="description"
                label="Descripcion"
                error={errors.description}
                className="sm:col-span-2"
                hint="Material, tipo de escudo, sponsors... lo que se consulta siempre."
              >
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={draft.description}
                  onChange={(event) => set('description', event.target.value)}
                  invalid={Boolean(errors.description)}
                />
              </Field>

              <Checkbox
                id="featured"
                name="featured"
                checked={draft.featured}
                onChange={(event) => set('featured', event.target.checked)}
                label="Marcar como destacada en el catalogo"
              />

              <Checkbox
                id="visible"
                name="visible"
                checked={draft.visible}
                onChange={(event) => set('visible', event.target.checked)}
                label="Visible en el catálogo público"
              />
            </div>
          </Section>

          <Section
            title="Talles y stock"
            error={errors.sizes}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set('sizes', [...draft.sizes, { size: '', stock: 0 }])}
              >
                Agregar talle
              </Button>
            }
          >
            <ul className="flex flex-col gap-2">
              {draft.sizes.map((size, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Input
                    aria-label={`Talle ${index + 1}`}
                    list="talles-sugeridos"
                    value={size.size}
                    placeholder="M"
                    onChange={(event) => setSize(index, { size: event.target.value.toUpperCase() })}
                    className="w-28"
                  />
                  <Input
                    aria-label={`Stock del talle ${index + 1}`}
                    type="number"
                    min={0}
                    value={size.stock}
                    onChange={(event) => setSize(index, { stock: Math.max(0, Number(event.target.value) || 0) })}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Quitar talle ${size.size || index + 1}`}
                    onClick={() =>
                      set('sizes', draft.sizes.filter((_, i) => i !== index))
                    }
                  >
                    Quitar
                  </Button>
                </li>
              ))}
            </ul>

            <datalist id="talles-sugeridos">
              {SIZE_ORDER.map((size) => (
                <option key={size} value={size} />
              ))}
            </datalist>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Totales:</span>
              {draft.sizes.map((size, index) => (
                <span
                  key={index}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700"
                >
                  {size.size || '?'}: {size.stock}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Imágenes">
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragOver
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-zinc-200 bg-zinc-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onPaste={handlePaste}
              tabIndex={0}
            >
              <p className="text-sm text-zinc-600">
                {uploading
                  ? 'Subiendo imagenes...'
                  : 'Arrastrá imágenes acá, pegalas con Ctrl+V, o'}{' '}
                <button
                  type="button"
                  className="font-medium text-brand-700 underline-offset-2 hover:underline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  elegí un archivo
                </button>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>

            {draft.images.length > 0 ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {draft.images.map((image, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2"
                  >
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                      <ProductImage
                        src={image}
                        alt={`Imagen ${index + 1}`}
                        colors={DEFAULT_COLORS}
                        initials="?"
                        className="size-full object-cover"
                      />
                      {index === 0 ? (
                        <span className="absolute inset-x-0 bottom-0 bg-brand-600/90 px-1 py-0.5 text-center text-[10px] font-semibold tracking-wide text-white">
                          Principal
                        </span>
                      ) : null}
                    </span>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Mover imagen ${index + 1} hacia arriba`}
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="rounded px-2 py-0.5 text-zinc-500 transition hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Mover imagen ${index + 1} hacia abajo`}
                          disabled={index === draft.images.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="rounded px-2 py-0.5 text-zinc-500 transition hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Quitar imagen ${index + 1}`}
                        onClick={() => set('images', draft.images.filter((_, i) => i !== index))}
                      >
                        Quitar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-amber-700">
                Sin imagenes: se muestra un placeholder generico.
              </p>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Section title="Vista previa" collapsible={false}>
            <div className="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
              <ProductImage
                src={draft.images[0] ?? ''}
                alt="Vista previa"
                colors={DEFAULT_COLORS}
                initials={draft.team ? draft.team.slice(0, 3).toUpperCase() : '?'}
                className="size-full object-cover"
              />
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-lg font-bold leading-snug text-zinc-900">
                {draft.name || 'Sin nombre'}
              </p>
              <p className="text-sm text-zinc-600">{draft.team || 'Equipo sin definir'}</p>
              <p className="text-base font-semibold text-brand-700">{formatPrice(draft.price)}</p>
            </div>
          </Section>

          <Section title="Acciones" collapsible={false}>
            <div className="flex flex-col gap-2">
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? 'Guardando…' : 'Guardar'}
              </Button>
              <ButtonLink href="/admin" variant="outline">
                Cancelar
              </ButtonLink>
            </div>
          </Section>
        </aside>
      </div>
    </form>
  )
}

function Section({
  title,
  hint,
  error,
  action,
  collapsible = true,
  children,
}: {
  title: string
  hint?: string
  error?: string
  action?: React.ReactNode
  collapsible?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex items-center gap-2 text-left"
          >
            <ChevronDown
              aria-hidden="true"
              className={[
                'size-4 shrink-0 text-zinc-400 transition-transform duration-200',
                open ? 'rotate-180' : '',
              ].join(' ')}
            />
            <span className="text-sm font-semibold text-zinc-900">{title}</span>
          </button>
        ) : (
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        )}
        {action}
      </div>

      {hint || error ? (
        <div className="px-5 pb-4">
          {error ? (
            <p className="text-xs font-medium text-red-600">{error}</p>
          ) : (
            <p className="text-xs text-zinc-500">{hint}</p>
          )}
        </div>
      ) : null}

      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </section>
  )
}

const ADD_OPTION = '__add__'

function SelectWithAdd({
  id,
  value,
  options,
  placeholder,
  addLabel,
  invalid,
  onChange,
}: {
  id: string
  value: string
  options: string[]
  placeholder: string
  addLabel: string
  invalid?: boolean
  onChange: (value: string) => void
}) {
  const [adding, setAdding] = useState(() => value !== '' && !options.includes(value))

  if (adding) {
    return (
      <div className="flex items-center gap-2">
        <Input
          id={id}
          name={id}
          value={value}
          placeholder={placeholder}
          invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            setAdding(false)
            onChange('')
          }}
          className="shrink-0 text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          Volver a la lista
        </button>
      </div>
    )
  }

  return (
    <Select
      id={id}
      name={id}
      value={value}
      invalid={invalid}
      onChange={(event) => {
        const next = event.target.value
        if (next === ADD_OPTION) {
          setAdding(true)
          onChange('')
          return
        }
        onChange(next)
      }}
    >
      <option value="">Seleccioná…</option>
      {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      <option value={ADD_OPTION}>+ {addLabel}…</option>
    </Select>
  )
}