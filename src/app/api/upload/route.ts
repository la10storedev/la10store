import { NextResponse } from 'next/server'
import { uploadBuffer } from '@/lib/cloudinary'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No se envio ningun archivo.' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen.' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80)
    const publicId = `${Date.now()}-${safeName}`

    const url = await uploadBuffer(buffer, publicId)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[upload] Cloudinary:', error)
    return NextResponse.json(
      { error: 'No pudimos subir la imagen. Intentalo de nuevo.' },
      { status: 500 },
    )
  }
}