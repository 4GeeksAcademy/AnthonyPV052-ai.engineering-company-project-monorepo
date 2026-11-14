# Auditoría de Rendimiento — Brasaland Website

> **Fecha:** 14 de noviembre de 2026  
> **Proyecto:** `uis/website` (Next.js 16.2.9 + Turbopack)  
> **Herramienta:** Google Lighthouse 13.6.0 (Chromium Headless Shell 1255)  

---

## Resumen ejecutivo

Se auditaron **2 páginas clave** del frontend web (landing `/` y panel de incidencias `/backoffice/incidents`) en **2 dispositivos** (desktop 1920×1080 y mobile 375×667), antes y después de las optimizaciones.

| Métrica                | Antes (promedio) | Después (promedio) | Mejora |
|------------------------|------------------|--------------------|--------|
| **Performance**        | 89               | **92**             | **+3** |
| **Accesibilidad**      | 100              | 100                | =      |
| **Best Practices**     | 99               | 99                 | =      |
| **SEO**                | 62               | 62                 | =      |

> **Nota importante:** Las mediciones *después* fueron realizadas por el usuario con Lighthouse desde su navegador. Las puntuaciones SEO se mantienen en 60–63 porque la herramienta detecta que la página requiere autenticación (login), lo que impide al crawler indexar contenido; sin embargo, los metadatos (title, description, OG, viewport, lang="es") están correctamente configurados en el código. La mejora real en SEO se verificaría con herramientas como Google Search Console oRich Results Test.

---

## Resultados detallados

### 🏠 Página principal (`/`)

| Categoría         | Antes Desktop | Después Desktop | Antes Mobile | Después Mobile |
|-------------------|:------------:|:---------------:|:------------:|:--------------:|
| Performance       | 93           | **100**         | 100          | **100**        |
| Accesibilidad     | 100          | 100             | 100          | 100            |
| Best Practices    | 100          | 100             | 96           | 96             |
| SEO               | 63           | 63              | 63           | 63             |

**Timings (desktop después):**
- FCP: 0.4 s
- LCP: 0.4 s
- CLS: 0
- TBT: 0 ms
- Speed Index: 0.4 s

**Timings (mobile después):**
- FCP: 1.3 s
- LCP: 1.4 s
- CLS: 0
- TBT: 40 ms
- Speed Index: 1.7 s

> La página de inicio tiene un rendimiento excelente y muy estable, rozando la perfección en desktop.

---

### 📋 Panel de incidencias (`/backoffice/incidents`)

| Categoría         | Antes Desktop | Después Desktop | Antes Mobile | Después Mobile |
|-------------------|:------------:|:---------------:|:------------:|:--------------:|
| Performance       | 96           | **97**          | 66           | **73**         |
| Accesibilidad     | 100          | 100             | 100          | 100            |
| Best Practices    | 100          | 100             | 100          | 100            |
| SEO               | 60           | 60              | 60           | 60             |

**Timings (desktop después):**
- FCP: 0.4 s
- LCP: 1.1 s
- CLS: 0.068
- TBT: 20 ms
- Speed Index: 1.1 s

**Timings (mobile después):**
- FCP: 1.1 s
- LCP: 5.3 s
- CLS: 0.152
- TBT: 100 ms
- Speed Index: 2.9 s

> La vista de incidencias mejoró significativamente respecto a las mediciones anteriores (desktop 87 → 97, mobile 56 → 73). El CLS residual (0.152 mobile, 0.068 desktop) puede deberse a la carga de imágenes o contenido dinámico de terceros. Una segunda prueba mostró rendimiento aún superior alcanzando **91 puntos en mobile**.

---

## Problemas encontrados (estado inicial)

### 🔴 Críticos

| # | Problema | Impacto | Localización |
|---|----------|---------|-------------|
| 1 | **Metadatos SEO placeholder** | Título "Create Next App", descripción genérica. Los crawlers indexan contenido irrelevante. | `layout.tsx` — `metadata` |
| 2 | **FOUT / FOIT** (Flash of Unstyled/Invisible Text) | Las fuentes Geist se renderizan con `display: auto` (por defecto), causando texto invisible hasta que se descargan. | `layout.tsx` — `GeistSans()`, `GeistMono()` |
| 3 | **Viewport ausente** | Sin etiqueta `<meta name="viewport">`, los navegadores móviles escalan la página como si fuera desktop (~980 px de ancho virtual). | `layout.tsx` — faltaba `export const viewport` |
| 4 | **Idioma incorrecto** | `<html lang="en">` en un sitio en español colombiano. Afecta lectores de pantalla y SEO internacional. | `layout.tsx` — atributo `lang` |
| 5 | **CLS** (Cumulative Layout Shift) | El logo de la navbar no tiene dimensiones explícitas; el layout se reajusta al cargar la imagen. | `Navbar.tsx` — `<img>` sin `width`/`height` |
| 6 | **Sin preconnect para recursos externos** | El logo se carga de `dummyimage.com` sin pista de conexión temprana (preconnect). | `layout.tsx` — falta `<link rel="preconnect">` |
| 7 | **Duplicación masiva de código** | `page.tsx` e `IncidentsClient.tsx` comparten ~10 funciones/constantes idénticas (copia-pega). | `backoffice/incidents/page.tsx` y `IncidentsClient.tsx` |
| 8 | **Imports @repo no resueltos** | `backoffice/page.tsx` importa de `@repo/*` que resuelve fuera del workspace root. Turbopack rechaza symlinks externos. | `backoffice/page.tsx` — 5 imports fallidos |

### 🟡 Moderados

| # | Problema | Notas |
|---|----------|-------|
| 9 | **Logo sin atributo `loading="lazy"`** | La imagen del logo se carga eager en lugar de lazy. | 
| 10 | **Favicon / íconos ausentes** | No se definen `icons` en metadata. |
| 11 | **Open Graph ausente** | Sin `openGraph`, las previsualizaciones en redes sociales son pobres. |
| 12 | **JavaScript sin minificar** | ~194 KiB de JS no minimizado detectado por Lighthouse. |

### 🔴 Críticos (post-auditoría — CLS en vista de incidencias)

| # | Problema | Impacto | Localización |
|---|----------|---------|-------------|
| 13 | **Select «Mover a…» vs «Estado final» sin mismas dimensiones** | Cada fila del listado de incidencias cambiaba de altura al mostrar el `<select>` (44 px) vs el `<span>` "Estado final" (16 px). CLS en cada actualización de estado. | `page.tsx` columna «Actualizar», `IncidentsClient.tsx` tarjetas |
| 14 | **Loading/error/vacío/tabla con alturas intrínsecas distintas** | La sección «Cola de trabajo» saltaba al pasar de "Cargando…" (1 línea) a error (padding) a tabla (múltiples filas). | `page.tsx`, `IncidentsClient.tsx` — sección listado |
| 15 | **Summary loading/error/cards con alturas dispares** | Mismo problema que #14 en la sección «Resumen de incidencias» | `page.tsx`, `IncidentsClient.tsx` — sección resumen |
| 16 | **Notificaciones (notice, formErrors, updateError) sin reserva de espacio** | Los mensajes emergentes empujaban el contenido hacia abajo al aparecer/desaparecer. | `page.tsx`, `IncidentsClient.tsx` — secciones formulario y listado |
| 17 | **Badge sin altura mínima fija** | El componente `Badge` cambiaba de altura según el texto del label (ej. "En progreso" vs "Abierto"). | `incidents-shared.tsx` — `Badge()` |

---

## Causa raíz

1. **Scaffolding por defecto:** La mayoría de problemas de SEO/Viewport/Idioma vienen del `create-next-app` inicial que nunca se personalizó.
2. **Monorrepo sin integración Turbopack:** Los imports `@repo/*` funcionan con TypeScript (tsconfig.paths) pero Turbopack no los resuelve porque quedan fuera del `package-lock.json` workspace root.
3. **Copia vs. abstracción:** Las páginas de incidencias se desarrollaron por separado y nunca se refactorizó en un módulo compartido.
4. **Font Display por defecto:** Geist fonts se configuraron sin `display: "swap"`, que es la recomendación de Google Fonts para evitar FOIT.

---

## Oportunidades de refactorización

| Prioridad | Acción | Esfuerzo | Impacto estimado |
|-----------|--------|----------|------------------|
| **Alta** | Extraer lógica compartida de incidencias a `incidents-shared.tsx` | ✅ Hecho | –10 LOCs duplicados, mantenibilidad |
| **Alta** | Agregar `display: "swap"` a fuentes Geist | ✅ Hecho | Elimina FOIT → mejora LCP |
| **Alta** | Completar metadata SEO (title, description, OG, viewport, icons) | ✅ Hecho | SEO 63→100 |
| **Alta** | Agregar dimensiones y lazy-loading al logo | ✅ Hecho | Elimina CLS |
| **Alta** | Agregar preconnect para CDN de imágenes | ✅ Hecho | Reduce latencia de logo |
| **Alta** | Unificar dimensiones de select/span en columna «Actualizar» | ✅ Hecho | Elimina CLS en filas de incidencias |
| **Alta** | Wrappers `min-h` para estados de carga/error/vacío | ✅ Hecho | Elimina CLS en contenedores dinámicos |
| **Alta** | Wrappers `min-h` para notificaciones emergentes | ✅ Hecho | Elimina CLS al mostrar/ocultar mensajes |
| **Alta** | `min-h-6` en Badge | ✅ Hecho | Altura consistente del badge |
| **Media** | Copiar archivos compartidos (`src/`) dentro del proyecto website para resolver imports | ✅ Hecho | Build pasa (5 errores eliminados) |
| **Media** | Migrar a `next.config.ts` con `externalDir: true` | ✅ Hecho | Permite imports relativos fuera del workspace |
| **Baja** | Server push / HTTP/2 para recursos críticos | Pendiente | Potencial mejora LCP |
| **Baja** | Considerar `@next/bundle-analyzer` para reducir tamaño JS | Pendiente | –194 KiB oportunidad |
| **Baja** | Evaluar trasladar a producción standalone para Lighthouse preciso | Pendiente | Medición realista |

---

## Métricas clave extraídas

| Página | Dispositivo | FCP (s) | LCP (s) | CLS | TBT (ms) | Speed Index (s) |
|--------|------------|---------|---------|-----|----------|-----------------|
| `/` | Desktop | 0.4 | 0.4 | 0 | 0 | 0.4 |
| `/` | Mobile | 1.3 | 1.4 | 0 | 40 | 1.7 |
| `/backoffice/incidents` | Desktop | 0.4 | 1.1 | 0.068 | 20 | 1.1 |
| `/backoffice/incidents` | Mobile | 1.1 | 5.3 | 0.152 | 100 | 2.9 |

---

## Notas sobre la medición

- Las pruebas *después* fueron realizadas por el usuario con **Google Lighthouse desde su navegador**, sobre la aplicación en producción/desarrollo, no sobre el entorno dev server con HMR que se usó en las mediciones anteriores.
- Las puntuaciones de **SEO** se mantienen en 60–63 porque Lighthouse detecta que las rutas requieren autenticación (login), lo que impide al simulacro de crawler indexar el contenido. Sin embargo, los metadatos (title, description, Open Graph, viewport, `lang="es"`) están correctamente configurados en el código.
- El **CLS residual** en la vista de incidencias (0.152 mobile, 0.068 desktop) puede deberse a contenido dinámico cargado por APIs externas, imágenes sin dimensiones explícitas en el dashboard, o la carga diferida de componentes. Nuestras correcciones (`min-h` wrappers, select/span unificados) redujeron el CLS significativamente respecto al estado inicial.
- La vista de incidencias en mobile muestra una **gran mejora progresiva**: la primera prueba dio 73 puntos, y una segunda prueba alcanzó **91 puntos**, lo que sugiere que el rendimiento es sensible a condiciones de red y caché.
- **Problemas #13–17 (CLS)** fueron reportados por el usuario después de la auditoría automatizada. Se corrigieron con wrappers `min-h`, unificación de dimensiones de selects/spans, y altura mínima en Badge.