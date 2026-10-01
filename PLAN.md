# Plan de Implementación: Mejoras Pre-Deploy la10store

## Resumen Ejecutivo

Rediseño completo del panel admin (estética Shopify-like) + hero editable + ajustes de tienda. 11 fases secuenciales con dependencias claras.

**Decisiones confirmadas:**
- SQL de `site_settings`: ejecutado por mí con admin client
- Inventario: precio inline + toggles (visible/destacado) + stock popover
- Dashboard: métricas clave + accesos rápidos

---

## Fase 0: Preparación

### 0.1 Instalar dependencias
```bash
npm install lucide-react
```

### 0.2 Ejecutar SQL en Supabase
Crear tabla `site_settings` con valores iniciales del hero.

**Archivo:** `scripts/setup-site-settings.ts` (nuevo)
- Conectar con admin client
- Ejecutar CREATE TABLE IF NOT EXISTS
- INSERT con ON CONFLICT DO NOTHING
- Log de resultados

**Verificación:** Query manual a Supabase confirma tabla y datos.

---

## Fase 1: Componentes UI Compartidos

### Archivos a crear:
- `src/components/ui/Toast.tsx` — Sistema de notificaciones (success, error, info)
- `src/components/ui/Toggle.tsx` — Switch component (on/off)
- `src/components/ui/ConfirmDialog.tsx` — Modal de confirmación reutilizable
- `src/components/ui/Popover.tsx` — Popover genérico (para stock editor)

**Diseño:**
- Toast: esquina superior derecha, auto-dismiss 3s, animación slide-in
- Toggle: estilo iOS, brand color cuando activo
- ConfirmDialog: modal centrado, overlay oscuro, botones "Cancelar" / "Confirmar"
- Popover: posicionamiento automático, cierre por click fuera / Escape

**Verificación:** TypeScript + ESLint sin errores.

---

## Fase 2: Admin Layout — Top Bar + Nav

### Archivos a modificar:
- `src/app/admin/(protegido)/layout.tsx` — Mejorar top bar
- `src/components/admin/AdminNav.tsx` — Agregar iconos + nuevas rutas

**Cambios en top bar:**
- Logo + nombre "Panel de control" a la izquierda
- Botón "Ver tienda" (ghost)
- Usuario + botón "Salir" a la derecha
- Separadores visuales sutiles

**AdminNav actualizado:**
```tsx
const links = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inventario', label: 'Inventario', icon: Package },
  { href: '/admin/productos/nuevo', label: 'Nueva camiseta', icon: Plus },
  { href: '/admin/apariencia', label: 'Apariencia', icon: Palette },
]
```

**Verificación:** Navegación entre páginas admin funciona, iconos visibles.

---

## Fase 3: Admin Dashboard

### Archivos:
- `src/app/admin/(protegido)/page.tsx` — Reescribir como Dashboard
- `src/app/admin/(protegido)/inventario/page.tsx` — Mover inventario actual aquí

**Dashboard content:**
```
┌─────────────────────────────────────────────┐
│ Bienvenido, [usuario]                        │
│ Resumen del catálogo                         │
├─────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ 9    │ │ 45   │ │ 2    │ │ 1    │        │
│ │Prod. │ │Stock │ │Últimas│ │Destac.│        │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────────────┤
│ Accesos rápidos                              │
│ [Nueva camiseta] [Editar hero] [Ver tienda] │
└─────────────────────────────────────────────┘
```

**Métricas:**
- Total productos (visibles + ocultos)
- Unidades en stock (suma de todos los talles)
- Productos con stock bajo (< 3 unidades totales)
- Productos destacados

**Server Action:** `getDashboardMetrics()` en `src/app/admin/actions/dashboard.ts`

**Verificación:** Dashboard carga métricas correctas desde Supabase.

---

## Fase 4: Admin Inventario Rediseñado

### Archivos:
- `src/app/admin/(protegido)/inventario/page.tsx` — Reescribir
- `src/components/admin/InventoryTable.tsx` — Tabla desktop (nuevo)
- `src/components/admin/InventoryCards.tsx` — Cards mobile (nuevo)
- `src/components/admin/StockPopover.tsx` — Editor de stock por talle (nuevo)
- `src/app/admin/actions/products.ts` — Agregar `updatePriceAction`, `toggleFeaturedAction`

**Desktop (≥768px):**
```
┌──────────────────────────────────────────────────────────────┐
│ [Buscar...]                                                  │
├──────────────────────────────────────────────────────────────┤
│ Camiseta          Precio    Stock   Visible Destacado Acciones│
│ Argentina 2022    $15.000   45 u.   ✓       ★         [Edit]│
│ Barcelona 23/24   $18.000   2 u.    ✓       -         [Edit]│
└──────────────────────────────────────────────────────────────┘
```

**Mobile (<768px):**
```
┌─────────────────────────┐
│ [Buscar...]             │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ [img] Argentina 2022│ │
│ │ $15.000 · 45 u.     │ │
│ │ ✓ Visible  ★ Destac.│ │
│ │ [Editar] [Stock]    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Edición rápida:**
- **Precio inline:** Click en precio → input numérico → Enter/blur guarda (Server Action)
- **Toggles:** Switch directo para visible/destacado (Server Action)
- **Stock popover:** Click en "45 u." → popover con lista de talles y stock editable

**Búsqueda cliente:** `useState` filtra por nombre/equipo/liga en tiempo real.

**Server Actions nuevos:**
```ts
updatePriceAction(id: string, price: number)
toggleFeaturedAction(id: string, featured: boolean)
```

**Verificación:** Edición rápida funciona en desktop y mobile, búsqueda filtra instantáneamente.

---

## Fase 5: Admin Formulario de Producto Rediseñado

### Archivos:
- `src/components/admin/ProductForm.tsx` — Reescribir completo

**Estructura:**
```
┌─────────────────────────────────────────────────────────────┐
│ Nueva camiseta                                               │
├──────────────────────────────────┬──────────────────────────┤
│                                  │                          │
│ [Datos básicos]                  │  Vista previa            │
│ Nombre: [________________]       │  ┌──────────────────┐   │
│ Equipo: [Argentina ▾]            │  │                  │   │
│ Tipo: ( ) Selección ( ) Club     │  │   [Imagen]       │   │
│ Liga: [Mundial ▾]                │  │                  │   │
│ Temporada: [2022____]            │  └──────────────────┘   │
│ Precio: [$ 15000___]             │  Nombre: Argentina 2022 │
│                                  │  Equipo: Argentina      │
│ [Descripción]                    │  Precio: $15.000        │
│ [_____________________________]  │                          │
│                                  │                          │
│ [Talles y stock]                 │  [Guardar]              │
│ S: [5__] M: [10__] L: [8__]     │  [Cancelar]             │
│ XL: [3__] [+ Agregar talle]      │                          │
│                                  │                          │
│ [Imágenes]                       │                          │
│ [Arrastrá imágenes acá]          │                          │
│ [thumb1] [thumb2] [thumb3]       │                          │
│                                  │                          │
└──────────────────────────────────┴──────────────────────────┘
```

**Cambios clave:**
- **Sidebar fijo** con vista previa + acciones (Guardar/Cancelar)
- **Secciones colapsables** (datos, talles, imágenes) — todas expandidas por defecto
- **Cero textos técnicos:** No se muestra "products.json", IDs, rutas de Cloudinary
- **Imágenes:** Solo thumbnails + botones ↑↓ / quitar. No se muestra URL
- **Precio:** `step={1}` (precio libre, no múltiplos de 1000)
- **Feedback inmediato:** Toast al guardar

**Verificación:** Formulario funciona para crear y editar, vista previa se actualiza en tiempo real.

---

## Fase 6: Admin Apariencia — Hero Editable

### Archivos:
- `src/app/admin/(protegido)/apariencia/page.tsx` — Nuevo
- `src/app/admin/actions/appearance.ts` — Server Actions (nuevo)
- `src/lib/products-store.ts` — Agregar `getSiteSettings()`, `setSiteSetting()`

**UI:**
```
┌─────────────────────────────────────────────┐
│ Apariencia del sitio                         │
│ Personalizá la página de inicio              │
├─────────────────────────────────────────────┤
│ Hero principal                               │
│                                              │
│ Imagen de fondo                              │
│ [thumbnail] [Cambiar imagen]                 │
│                                              │
│ Título principal                             │
│ [Camisetas de selecciones y clubes______]    │
│                                              │
│ Subtítulo                                    │
│ [Elegí tu talle y consultanos por WhatsApp_] │
│                                              │
│ Tagline (texto pequeño arriba)               │
│ [Tu camiseta, tu pasión__________________]   │
│                                              │
│ Texto del botón                              │
│ [Ver catalogo__________________________]     │
│                                              │
│ Link del botón                               │
│ [#catalogo_____________________________]     │
│                                              │
│ [Guardar cambios]                            │
└─────────────────────────────────────────────┘
```

**Server Actions:**
```ts
saveHeroAction(formData: FormData) // Guarda todos los campos del hero
```

**Internals:**
- Leer `site_settings` con `getSiteSettings()`
- Guardar con `setSiteSetting(key, value)`
- Upload de imagen a Cloudinary (reutilizar `/api/upload`)

**Verificación:** Cambios en hero se reflejan inmediatamente en la tienda.

---

## Fase 7: Hero Dinámico en Tienda

### Archivos:
- `src/app/(shop)/page.tsx` — Reemplazar hero inline con componente dinámico
- `src/components/shop/Hero.tsx` — Nuevo componente (nuevo)

**Lógica:**
```tsx
// src/app/(shop)/page.tsx
const heroSettings = await getSiteSettings()

return (
  <Hero
    image={heroSettings.hero_image || '/img/hero.jpg'}
    title={heroSettings.hero_title}
    subtitle={heroSettings.hero_subtitle}
    tagline={heroSettings.hero_tagline}
    ctaText={heroSettings.hero_cta_text}
    ctaLink={heroSettings.hero_cta_link}
  />
)
```

**Fallback:** Si `hero_image` está vacío, usar `/img/hero.jpg`.

**Verificación:** Hero muestra valores de Supabase, fallback funciona si no hay imagen.

---

## Fase 8: Tienda — Ajustes Finos

### Archivos:
- `src/components/products/ProductCard.tsx` — Agregar hover effect
- `src/app/(shop)/products/[id]/page.tsx` — Simplificar ficha técnica
- `src/app/(shop)/page.tsx` — Agregar sección envío/pagos con iconos

**Cambios:**
1. **ProductCard hover:** Zoom suave en imagen (ya existe `group-hover:scale-105`), agregar shadow sutil
2. **ProductPage:** Mover "ficha técnica" (descripción detallada) a un `<details>` colapsable en vez de sección separada
3. **Sección envío/pagos:** Agregar iconos de Lucide (Truck, CreditCard, MessageCircle) antes de cada bloque

**Verificación:** Hover effects funcionan, ficha técnica colapsa, iconos visibles.

---

## Fase 9: Precio Libre

### Archivos:
- `src/components/admin/ProductForm.tsx` — Cambiar `step={1000}` a `step={1}`

**Cambio mínimo:**
```tsx
// Antes
<Input type="number" step={1000} ... />

// Después
<Input type="number" step={1} ... />
```

**Verificación:** Input acepta cualquier valor entero, no solo múltiplos de 1000.

---

## Fase 10: DAL — Nuevas Funciones

### Archivos:
- `src/lib/products-store.ts` — Agregar funciones para site_settings

**Funciones nuevas:**
```ts
export async function getSiteSettings(): Promise<Record<string, string>>
export async function setSiteSetting(key: string, value: string): Promise<void>
export async function setProductFeatured(id: string, featured: boolean): Promise<void>
export async function updateProductPrice(id: string, price: number): Promise<void>
```

**Implementación:**
- `getSiteSettings()`: SELECT * FROM site_settings → transformar a objeto `{key: value}`
- `setSiteSetting()`: UPSERT en site_settings
- `setProductFeatured()`: UPDATE products SET featured = $1 WHERE id = $2
- `updateProductPrice()`: UPDATE products SET price = $1 WHERE id = $2

**Verificación:** Funciones leen/escriben correctamente en Supabase.

---

## Fase 11: Lighthouse Audit

### Pasos:
1. Ejecutar `npm run build` para generar build de producción
2. Levantar servidor local: `npm start`
3. Ejecutar Lighthouse en:
   - Página de inicio (/)
   - Página de producto (/products/[id])
   - Panel admin (/admin)
4. Documentar métricas:
   - Performance
   - Accessibility
   - Best Practices
   - SEO
5. Identificar y corregir issues críticos (si los hay)

**Verificación:** Todas las métricas > 90.

---

## Orden de Ejecución

```
Fase 0 (preparación)
  ↓
Fase 1 (UI components)
  ↓
Fase 10 (DAL - puede ir antes de Fase 6/7)
  ↓
Fase 2 (admin layout)
  ↓
Fase 3 (dashboard)
  ↓
Fase 4 (inventario)
  ↓
Fase 5 (formulario)
  ↓
Fase 6 (apariencia)
  ↓
Fase 7 (hero dinámico)
  ↓
Fase 8 (ajustes tienda)
  ↓
Fase 9 (precio libre)
  ↓
Fase 11 (lighthouse)
```

**Nota:** Fase 10 (DAL) debe completarse antes de Fase 6 (apariencia) y Fase 7 (hero dinámico).

---

## Criterios de Aceptación

### Admin
- [ ] Dashboard muestra métricas correctas
- [ ] Inventario permite edición rápida (precio, toggles, stock)
- [ ] Búsqueda en inventario filtra instantáneamente
- [ ] Formulario de producto es intuitivo (cero textos técnicos)
- [ ] Página de apariencia permite editar hero completo
- [ ] Todos los cambios se guardan en Supabase (no en JSON)

### Tienda
- [ ] Hero muestra valores editables desde admin
- [ ] Fallback a `/img/hero.jpg` si no hay imagen personalizada
- [ ] ProductCard tiene hover effect suave
- [ ] Ficha técnica es colapsable (no sección separada)
- [ ] Sección envío/pagos tiene iconos

### General
- [ ] TypeScript sin errores
- [ ] ESLint sin errores
- [ ] Lighthouse > 90 en todas las métricas
- [ ] Responsive: mobile, tablet, desktop
- [ ] Accesibilidad: navegación por teclado, ARIA labels

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| SQL de `site_settings` falla | Verificar permisos del admin client, ejecutar manualmente si es necesario |
| Popover de stock no posiciona bien en mobile | Usar `position: fixed` + calcular posición con `getBoundingClientRect()` |
| Hero no carga imagen de Cloudinary | Fallback a `/img/hero.jpg`, validar URL en admin antes de guardar |
| Búsqueda en inventario lenta con muchos productos | Debounce 300ms + índice en Supabase (si crece > 100 productos) |

---

## Archivos Nuevos (resumen)

```
src/
├── components/
│   ├── ui/
│   │   ├── Toast.tsx
│   │   ├── Toggle.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── Popover.tsx
│   ├── admin/
│   │   ├── InventoryTable.tsx
│   │   ├── InventoryCards.tsx
│   │   └── StockPopover.tsx
│   └── shop/
│       └── Hero.tsx
├── app/
│   ├── admin/
│   │   ├── (protegido)/
│   │   │   ├── inventario/page.tsx
│   │   │   └── apariencia/page.tsx
│   │   └── actions/
│   │       ├── dashboard.ts
│   │       └── appearance.ts
scripts/
└── setup-site-settings.ts
```

---

## Archivos Modificados (resumen)

```
src/
├── lib/
│   └── products-store.ts (agregar 4 funciones)
├── app/
│   ├── admin/
│   │   ├── (protegido)/
│   │   │   ├── layout.tsx (top bar mejorada)
│   │   │   └── page.tsx (convertir en dashboard)
│   │   └── actions/
│   │       └── products.ts (agregar 2 actions)
│   └── (shop)/
│       ├── page.tsx (hero dinámico)
│       └── products/[id]/page.tsx (ficha colapsable)
├── components/
│   ├── admin/
│   │   ├── AdminNav.tsx (iconos + nuevas rutas)
│   │   └── ProductForm.tsx (rediseño completo)
│   └── products/
│       └── ProductCard.tsx (hover effect)
package.json (agregar lucide-react)
```

---

## Estimación de Tiempo

| Fase | Tiempo estimado |
|------|----------------|
| 0. Preparación | 5 min |
| 1. UI components | 30 min |
| 2. Admin layout | 20 min |
| 3. Dashboard | 25 min |
| 4. Inventario | 45 min |
| 5. Formulario | 40 min |
| 6. Apariencia | 35 min |
| 7. Hero dinámico | 15 min |
| 8. Ajustes tienda | 20 min |
| 9. Precio libre | 2 min |
| 10. DAL functions | 20 min |
| 11. Lighthouse | 30 min |
| **Total** | **~4.5 horas** |

---

## Notas Finales

- **No hacer commits** hasta que el usuario lo solicite explícitamente
- **Ejecutar TypeScript + ESLint** al final de cada fase
- **Probar en mobile** cada componente responsive
- **Documentar** cualquier decisión de diseño no obvia en comentarios
- **Mantener compatibilidad** con productos existentes (no romper schema)

---

**Estado:** Plan completo, listo para ejecutar tras confirmación del usuario.
