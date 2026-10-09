import { Mail, MessageCircle } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'
import { InstagramIcon } from '@/components/ui/InstagramIcon'
import {
  getContactNumbers,
  getFooterSettings,
  getWhatsAppMessage,
  getWhatsAppNumber,
} from '@/lib/products-store'
import { buildWhatsAppLink } from '@/lib/whatsapp'
import { siteConfig } from '@/lib/site'

/**
 * Pie de sitio sobre fondo negro fijo (`#09090b`, no cambia con el modo
 * oscuro). El contenido (descripcion, contacto, copyright) lo edita el admin
 * desde el panel y se lee de `site_settings`.
 *
 * Layout: dos columnas (marca + contacto). La columna de navegacion se
 * elimino: los unicos accesos relevantes son los de contacto directo
 * (WhatsApp, email, Instagram).
 */
export async function Footer() {
  const year = new Date().getFullYear()
  const [{ description, email, instagramUrl, copyright }, contacts, whatsappNumber, whatsappMessage] =
    await Promise.all([
      getFooterSettings(),
      getContactNumbers(),
      getWhatsAppNumber(),
      getWhatsAppMessage(),
    ])

  const copyrightText = copyright
    .replaceAll('{year}', String(year))
    .replaceAll('{name}', siteConfig.name)

  return (
    <footer className="mt-24 border-t border-zinc-800 bg-[#09090b] text-zinc-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Logo tone="light" />
          <h2 className="text-lg font-semibold text-white">{siteConfig.shortName}</h2>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-400">{description}</p>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Contacto
          </p>
          {contacts.map((contact) => (
            <a
              key={`${contact.name}-${contact.number}`}
              href={buildWhatsAppLink(
                { productName: 'un articulo del catalogo' },
                contact.number || whatsappNumber,
                whatsappMessage,
              )}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
            >
              <MessageCircle size={16} aria-hidden />
              WhatsApp · {contact.name}
            </a>
          ))}
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            <Mail size={16} aria-hidden />
            {email}
          </a>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-white"
          >
            <InstagramIcon size={16} aria-hidden />
            Instagram
          </a>
        </div>
      </div>

      <div className="border-t border-zinc-800 px-4 py-6 sm:px-6">
        <p className="mx-auto max-w-6xl text-xs text-zinc-500">{copyrightText}</p>
      </div>
    </footer>
  )
}
