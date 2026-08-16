## Estado actual de desarrollo
 - Página "Home" de Braqsaland creada
 - Talent pipeline tracker creado.
 - Formulario de contacto creado y navegable desde la página principal
## próximos pasos previstos
- Añadir features para resolver los problemas pendientes.

## avances recientes
- Se ajustó el analizador de incidencias para compatibilidad con incidents-brasaland.csv.
- Se actualizó el expected de evaluación de incidencias con las métricas del dataset objetivo.
- Se implementó un backend de proveedores con FastAPI, TinyDB y seeder idempotente.
- Se añadió interfaz de proveedores en backoffice y navegación desde la web.
- Se creó la estructura solicitada en monorepo: services/api y uis/application/app/suppliers.
- Se implementó AUTH-01 en services/api: módulos users/profiles en TinyDB, login JWT, dependencia get_current_user y protección de rutas sensibles.
- Se corrigió la resolución de `src/data/sample` para que el build de Next.js use el módulo TypeScript `sample.ts`.
- Se integró AUTH-01 en website: login, registro, almacenamiento local de JWT, guard cliente y Bearer en el directorio de proveedores.
- Se añadió el perfil de usuario en el backoffice, con edición de datos opcionales, acceso de perfil, aviso de campos pendientes y navegación a inicio.
- Se incorporó recuperación y cambio de contraseña: tokens de un solo uso, envío por Resend y vistas públicas/protegidas en website.
- Se implementó el gestor centralizado de incidencias en services/api: CRUD de lectura/creación, filtros, resumen agregado, transiciones de estado y manejo uniforme de errores.
- Se añadió el gestor de incidencias al backoffice: registro con validación y feedback, listado filtrable con actualización de estado y panel de resumen resiliente.
- Se conectó el seeder del histórico `incidents-brasaland.csv` al almacenamiento TinyDB del API y al comando estándar de seed.
