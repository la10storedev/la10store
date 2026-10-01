import { v2 as cloudinary } from 'cloudinary'

/**
 * Configuracion de Cloudinary con resolucion perezosa.
 *
 * Las credenciales se leen en tiempo de ejecucion (no en tiempo de import),
 * asi soportan tanto el runtime de Next (que carga .env antes de los modulos)
 * como scripts sueltos con tsx (donde los imports corren antes de loadEnvFile).
 *
 * Soporta dos formatos:
 *   1) CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
 *   2) CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
 */

type CloudinaryConfig = { cloud_name: string; api_key: string; api_secret: string }

function resolveConfig(): CloudinaryConfig {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    return { cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET }
  }
  const url = process.env.CLOUDINARY_URL
  if (!url) throw new Error('Cloudinary no configurado: defini CLOUDINARY_URL o las 3 variables.')
  const match = url.match(/^cloudinary:\/\/([^:@/]+):([^@/]+)@([^/?]+)/)
  if (!match) throw new Error('CLOUDINARY_URL con formato invalido.')
  const [, api_key, api_secret, cloud_name] = match
  return { api_key, api_secret, cloud_name }
}

export function getCloudName(): string {
  return resolveConfig().cloud_name
}

/**
 * Sube un buffer de imagen a la carpeta `la10store` de Cloudinary y devuelve
 * la URL segura (secure_url). `publicId` es el nombre del asset dentro de la
 * carpeta; Cloudinary agrega el formato automaticamente.
 */
export function uploadBuffer(buffer: Buffer, publicId: string): Promise<string> {
  cloudinary.config(resolveConfig())
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'la10store', public_id: publicId, overwrite: true, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error)
        if (!result) return reject(new Error('Cloudinary no devolvio resultado.'))
        resolve(result.secure_url)
      },
    )
    stream.end(buffer)
  })
}

export default cloudinary
