'use client'

import { useActionState } from 'react'
import { loginAction, type LoginState } from '@/app/admin/actions/auth'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'

type LoginFormProps = {
  /** Destino original, para volver a el tras iniciar sesion. */
  next: string
}

/**
 * Formulario de login.
 * `useActionState` (React 19) maneja el estado de la Server Action: si las
 * credenciales fallan, la accion devuelve `{ error }` en vez de redirigir.
 */
export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <Field htmlFor="username" label="Usuario">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          autoFocus
          placeholder="admin"
        />
      </Field>

      <Field htmlFor="password" label="Contrasena">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? 'Verificando…' : 'Entrar al panel'}
      </Button>

      <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
        <strong className="font-semibold">Demo:</strong> usuario <code>admin</code> y contrasena{' '}
        <code>admin123</code> (definidos en <code>.env.local</code>). Cambialos antes de publicar.
      </p>
    </form>
  )
}
