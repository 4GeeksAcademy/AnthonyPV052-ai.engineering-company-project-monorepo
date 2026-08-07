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