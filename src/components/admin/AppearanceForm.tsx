'use client'

import { useActionState, useRef, useState } from 'react'
import { saveHeroAction } from '@/app/admin/actions/appearance'
import type { FormState } from '@/app/admin/actions/products'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Form'

/**
 * Formulario de apariencia: edita los campos del hero de la portada.
 *
 * La imagen se sube a Cloudinary por el mismo `/api/upload` que usan las
 * camisetas; el resto viaja en el FormData al server action.
 */
type AppearanceFormProps = {
  initial: {
    heroImage: string
    heroTitle: string
    heroSubtitle: string
    heroTagline: string
  }
}

export function AppearanceForm({ initial }: AppearanceFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveHeroAction,
    {},
  )
  const [heroImage, setHeroImage] = useState(initial.heroImage)
  const [heroTitle, setHeroTitle] = useState(initial.heroTitle)
  const [heroSubtitle, setHeroSubtitle] = useState(initial.heroSubtitle)
  const [heroTagline, setHeroTagline] = useState(initial.heroTagline)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Error al subir la imagen')
    const data = await res.json()
    return data.url as string
  }

  async function handleFiles(files: FileList | File[]) {
    const imageFile = Array.from(files).find((f) => f.type.startsWith('image/'))
    if (!imageFile) return
    setUploading(true)
    try {
      const url = await uploadFile(imageFile)
      setHeroImage(url)
    } catch {
      // silencioso: el usuario puede reintentar
    } finally {
      setUploading(false)
    }
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
        <h2 className="text-sm font-semibold text-zinc-900">Imagen de fondo</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Banner del hero. Si no hay imagen, se usa la de portada por defecto.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element -- preview del asset, sin optimizacion */}
            <img
              src={heroImage || '/img/hero.jpg'}
              alt=""
              aria-hidden
              className="size-full object-cover object-[80%_center]"
            />
          </div>

          <div className="flex flex-col items-start gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Subiendo…' : 'Cambiar imagen'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {heroImage ? (
              <button
                type="button"
                className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                onClick={() => setHeroImage('')}
              >
                Volver a la imagen por defecto
              </button>
            ) : null}
          </div>
        </div>

        <input type="hidden" name="hero_image" value={heroImage} />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Textos del hero</h2>
        <div className="mt-4 grid gap-4">
          <Field
            htmlFor="hero_title"
            label="Titulo principal"
            hint="Titular grande que se ve en el hero."
          >
            <Input
              id="hero_title"
              name="hero_title"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
            />
          </Field>

          <Field
            htmlFor="hero_subtitle"
            label="Subtitulo"
            hint="Bajada debajo del titulo."
          >
            <Textarea
              id="hero_subtitle"
              name="hero_subtitle"
              rows={3}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
            />
          </Field>

          <Field htmlFor="hero_tagline" label="Tagline" hint="Linea superior en mayusculas pequeñas.">
            <Input
              id="hero_tagline"
              name="hero_tagline"
              value={heroTagline}
              onChange={(e) => setHeroTagline(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}