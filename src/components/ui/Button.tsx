import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'

/**
 * Botones reutilizables.
 *
 * Estetica minimalista tipo ecommerce deportivo: rectos (`rounded-none`),
 * mayusculas con tracking amplio y accion principal en el naranja de la marca.
 *
 * Sin dependencias externas: las variantes se resuelven con un mapa de clases
 * de Tailwind. `buttonStyles` se exporta aparte para poder aplicar el mismo
 * estilo en `<Link>` o en elementos que no son `<button>`.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'whatsapp'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-none font-semibold uppercase ' +
  'tracking-[0.08em] transition-colors duration-200 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'border border-zinc-950 bg-white text-zinc-950 hover:bg-zinc-950 hover:text-white',
  outline: 'border border-zinc-300 bg-white text-zinc-950 hover:border-zinc-950',
  ghost: 'text-zinc-600 hover:text-zinc-950',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  // El CTA de WhatsApp usa el naranja de la marca.
  whatsapp: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[11px]',
  md: 'px-5 py-2.5 text-xs',
  lg: 'px-7 py-3.5 text-sm',
}

type StyleOptions = {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

export function buttonStyles({ variant = 'primary', size = 'md', className = '' }: StyleOptions = {}): string {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(' ')
}

type ButtonProps = ComponentPropsWithoutRef<'button'> & StyleOptions

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & StyleOptions

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonStyles({ variant, size, className })} {...props} />
}
