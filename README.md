# Tienda de Camisetas de Fútbol

Catálogo web interactivo para una tienda de camisetas de fútbol. **No procesa pagos**: el
usuario arma su consulta (camiseta + talle) y cierra la venta por WhatsApp mediante un enlace
prearmado.

> **Branding:** el nombre de la marca y el logo todavía no están definidos. En todo el proyecto
> se usan **placeholders** (nombre `TU MARCA`, monograma `TM`, paleta monocroma tipo adidas/nike). Ver
> [Personalización](#personalización) para reemplazarlos.

---

## Stack

| Tecnología        | Versión   | Notas                                              |
| ----------------- | --------- | -------------------------------------------------- |
| Next.js           | 16.3.6    | App Router, Server Actions, Proxy (ex-middleware)  |
| React             | 19.2.8    | `useActionState`, `use(params)`                    |
| TypeScript        | 5         | `strict: true`                                     |
| Tailwind CSS      | 4         | Config CSS-first vía `@theme` (sin `tailwind.config`) |
| Datos             | JSON      | Simulados, fáciles de migrar a una DB real         |

---

## Puesta en marcha

```bash
npm install
Copy-Item .env.example .env.local   # bash: cp .env.example .env.local
npm run dev
```

Abrir <http://localhost:3000>.

| Comando          | Descripción                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Servidor de desarrollo               |
| `npm run build`  | Build de producción                  |
| `npm run start`  | Servir el build de producción        |
| `npm run lint`   | ESLint                               |

### Variables de entorno (`.env.local`)

| Variable                       | Default (dev)                  | Descripción                                    |
| ------------------------------ | ------------------------------ | ---------------------------------------------- |
| `ADMIN_USER`                   | `admin`                        | Usuario del panel `/admin`                     |
| `ADMIN_PASSWORD`               | `admin123`                     | Contraseña del panel `/admin`                  |
| `SESSION_SECRET`               | `dev-secret-cambialo...`       | Secreto HMAC para firmar la cookie de sesión   |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`  | `5491123456789`                | Número que recibe las consultas (solo dígitos) |

> En producción, **cambiá `ADMIN_PASSWORD` y `SESSION_SECRET`**. La sesión dura 8 h y la cookie
> es `httpOnly` + `sameSite=lax` (+ `secure` en prod).

---

## Vistas

### Públicas

- **`/` — Catálogo.** Grilla responsive (mobile-first) con tarjetas que muestran imagen, título y
  estado de stock. Filtros por búsqueda, categoría, liga, equipo, talle, disponibilidad y orden.
  Los filtros se reflejan en la URL (`?categoria=...&liga=...`), por lo que son compartibles.
- **`/products/[id]` — Detalle.** Galería de varias imágenes, selector de talle, descripción,
  disponibilidad y el botón principal **"Consultar por esta camiseta"**, que abre WhatsApp con un
  mensaje que ya incluye el nombre del producto, el talle y la referencia.

### Privada

- **`/admin/login`** — Acceso (credenciales de `.env.local`).
- **`/admin`** — Tabla de inventario con tarjetas de resumen y **control rápido de stock**
  (`−` / `+` por talle, funciona incluso sin JavaScript).
- **`/admin/productos/nuevo`** — Alta de producto (datos, talles+stock, múltiples imágenes, colores).
- **`/admin/productos/[id]/editar`** — Edición y eliminación.

---

## Arquitectura

```
camisetas/
├── public/img/                     # Imágenes de productos (placeholder SVG + tus fotos)
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout raíz (html/body, fuentes, metadata)
│   │   ├── globals.css             # Tailwind v4 + @theme (paleta de marca)
│   │   ├── not-found.tsx           # 404 global
│   │   ├── (shop)/                 # Shell público (Navbar + Footer)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Catálogo  →  /
│   │   │   └── products/[id]/page.tsx   # Detalle
│   │   └── admin/
│   │       ├── layout.tsx          # Wrapper mínimo (robots: noindex)
│   │       ├── login/page.tsx      # Login (público)
│   │       ├── (protegido)/        # Requiere sesión
│   │       │   ├── layout.tsx      # Topbar + AdminNav
│   │       │   ├── page.tsx        # Inventario
│   │       │   └── productos/
│   │       │       ├── nuevo/page.tsx
│   │       │       └── [id]/editar/page.tsx
│   │       └── actions/            # Server Actions
│   │           ├── auth.ts         # login / logout
│   │           └── products.ts     # crear / editar / borrar / stock
│   ├── components/
│   │   ├── ui/                     # Button, Badge, Form, EmptyState, StockBadge
│   │   ├── layout/                 # Logo, Navbar, Footer, MobileNav
│   │   ├── products/               # ProductCard, ProductGrid, ProductGallery,
│   │   │                           #   SizeSelector, ProductFilters, ProductContactPanel,
│   │   │                           #   ProductImage, JerseyPlaceholder
│   │   └── admin/                  # AdminNav, LoginForm, ProductForm, DeleteProductForm
│   ├── data/products.json          # ← Datos simulados (mock)
│   ├── lib/
│   │   ├── site.ts                 # Config de marca (PLACEHOLDER)
│   │   ├── products.ts             # Lógica de dominio pura (filtros, stock, facets)
│   │   ├── products-store.ts       # Capa de acceso a datos (DAL) — server-only
│   │   ├── auth.ts                 # Sesión (HMAC) — server-only
│   │   ├── whatsapp.ts             # Armado de links de WhatsApp
│   │   └── format.ts               # Precio / fecha / normalización de texto
│   ├── proxy.ts                    # Protección de /admin/* (Next 16)
│   └── types/product.ts            # Tipos compartidos
└── .env.example
```

### Capas

- **`lib/products.ts`** — lógica de dominio **pura** (sin I/O), usable desde el cliente.
- **`lib/products-store.ts`** — **única** capa que toca el almacenamiento. Hoy lee/escribe el JSON
  con `node:fs`. Es el punto exacto a reemplazar por una base de datos real.
- **Server Actions** — todas las mutaciones re-verifican la sesión (`requireSession()`), porque son
  alcanzables por POST directo.

---

## Personalización

Todo el branding está centralizado:

1. **`src/lib/site.ts`** — nombre, tagline, WhatsApp, email, Instagram.
2. **`src/components/layout/Logo.tsx`** — reemplazar el monograma por tu `<Image src="/logo.svg" />`.
3. **`src/app/globals.css`** — la paleta `--color-brand-*` (hoy es una escala monocroma a proposito; es placeholder).

### Imágenes de productos

Los 8 productos de ejemplo apuntan a SVGs en **`public/img/`**. Para la demo con fotos reales,
dejá tus archivos en esa carpeta y actualizá las rutas en `src/data/products.json` (o desde el
panel `/admin`). En una etapa posterior se reemplazan por un bucket (**Supabase Storage** o
**Cloudinary**): solo hay que cambiar los valores de `images` por las URLs del bucket.

---

## Migrar el mock a una base de datos real

El diseño está pensado para que la migración toque **una sola capa**: `src/lib/products-store.ts`.
Las páginas y los Server Actions ya consumen esa interfaz, no el JSON.

1. **Elegir DB** — por ejemplo Supabase/Postgres o Prisma + SQLite/Postgres.
2. **Replicar los tipos** de `src/types/product.ts` como esquema. Sugerencia: una tabla
   `products` + una tabla `product_sizes (product_id, size, stock)` para el stock por talle, y
   `product_images (product_id, url, position)` si querés normalizar.
3. **Reimplementar** las funciones exportadas, manteniendo las mismas firmas:
   `getAllProducts`, `getProductById`, `slugify`, `createProduct`, `updateProduct`,
   `deleteProduct`, `adjustStock`.
4. **Quitar el caché por `mtime`** del DAL: con una DB real, usar `revalidatePath('/')` /
   `revalidateTag(...)` en los Server Actions (los comentarios del código lo indican).
5. **Imágenes** — subir a un bucket y guardar solo la URL en `images`.

> El almacenamiento por archivo es **solo para demo/dev**; en un hosting serverless de solo lectura
> no persiste. La DB real resuelve eso.

---

## Notas de implementación (Next.js 16)

- **Proxy (ex-middleware):** `src/proxy.ts` protege `/admin/*` de forma optimista; la verificación
  real de la sesión vuelve a hacerse en `admin/(protegido)/layout.tsx` y en cada Server Action.
- **`params` / `searchParams` son Promises:** se resuelven con `await` en el servidor.
- **Tailwind v4:** el tema se define en CSS (`@theme`) dentro de `globals.css`; no hay
  `tailwind.config.ts`. La app es **solo tema claro**.
- **`next/image`:** se usó `<img>` con fallback a un jersey SVG para tolerar imágenes faltantes.
- 
