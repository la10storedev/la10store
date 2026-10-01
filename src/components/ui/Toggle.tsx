'use client'

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

/**
 * Switch estilo iOS: track redondeado y thumb circular.
 * Activo usa el naranja de la marca (`bg-brand-600`).
 */
export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        checked ? 'bg-brand-600' : 'bg-zinc-300',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block size-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )

  if (!label) return button

  return (
    <label className="flex cursor-pointer items-center gap-3 select-none">
      {button}
      <span className="text-sm font-medium text-zinc-800">{label}</span>
    </label>
  )
}