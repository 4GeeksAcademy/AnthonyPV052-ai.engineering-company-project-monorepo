import dynamic from "next/dynamic";

const DashboardMetrics = dynamic(
  () => import("@/components/DashboardMetrics"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20 text-sm text-slate-400">
        Cargando dashboard…
      </div>
    ),
  },
);

export default function BackofficeHomePage() {

  return (
    <div className="space-y-10">
      <section className="relative min-h-[78vh] overflow-hidden rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 via-cyan-950 to-orange-900 p-8 sm:p-12">
        <div className="absolute -right-20 -top-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <p className="inline-flex rounded-full border border-cyan-200/40 bg-cyan-200/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
            Backoffice Brasaland
          </p>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Panel operativo con datos de muestra listos para explorar
          </h1>
          <p className="max-w-2xl text-base text-slate-200 sm:text-lg">
            Esta vista usa los tipos, utilidades y data del directorio src para transformar informacion de ventas,
            locaciones y menu en metricas accionables.
          </p>
          <a
            href="#dashboard"
            className="inline-flex rounded-full bg-orange-300 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-slate-900 transition hover:bg-orange-200"
          >
            Ver dashboard
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-300/30 bg-emerald-950/20 p-5">
        <h2 className="text-xl font-bold text-white">Módulo de incidencias de postventa</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Registra, filtra y resuelve incidencias operativas, de cliente e internas desde un único panel.
        </p>
        <a
          href="/backoffice/incidents"
          className="mt-4 inline-flex rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-emerald-200"
        >
          Abrir gestor de incidencias
        </a>
      </section>

      <section className="rounded-2xl border border-amber-300/30 bg-amber-950/20 p-5">
        <h2 className="text-xl font-bold text-white">Directorio de proveedores</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Consulta y gestiona proveedores por país y categoría, actualiza tarifas y controla estados activo/suspendido.
        </p>
        <a
          href="/backoffice/suppliers"
          className="mt-4 inline-flex rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-amber-200"
        >
          Abrir directorio de proveedores
        </a>
      </section>

      <section className="rounded-2xl border border-sky-300/30 bg-sky-950/20 p-5">
        <h2 className="text-xl font-bold text-white">Inventario de productos</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Gestiona el inventario de ingredientes y productos: consulta stock, registra entradas de proveedores,
          salidas por consumo o merma, y revisa el historial completo de órdenes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/backoffice/inventory/products"
            className="inline-flex rounded-full bg-sky-300 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-sky-200"
          >
            Ver productos
          </a>
          <a
            href="/backoffice/inventory/orders"
            className="inline-flex rounded-full border border-sky-300/60 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-sky-200 transition hover:bg-sky-500/10"
          >
            Historial de órdenes
          </a>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-300/30 bg-violet-950/20 p-5">
        <h2 className="text-xl font-bold text-white">Telemetría — Radar de ingeniería</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">
          Métricas técnicas del sistema: volumen de eventos, distribución de errores de API y tasa de fallo de autenticación.
          Vista operacional para el equipo de ingeniería.
        </p>
        <a
          href="/backoffice/telemetry"
          className="mt-4 inline-flex rounded-full bg-violet-300 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-violet-200"
        >
          Ver reporte de telemetría
        </a>
      </section>

      <DashboardMetrics />
    </div>
  );
}
