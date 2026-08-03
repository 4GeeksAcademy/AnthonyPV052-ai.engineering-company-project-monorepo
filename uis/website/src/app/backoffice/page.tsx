import type { WasteRecord } from "@repo/types/model";
import { sampleLocations, sampleMenuItems, sampleSales } from "@repo/data/sample";
import { filterActiveLocations, sortMenuItemsByPrice } from "@repo/utils/collections";
import { findLocationById, findMenuItemByName } from "@repo/utils/search";
import {
  calculateAverageTicket,
  calculateDailyRevenue,
  calculateCountryComparison,
  findTopSellingItems,
  rankLocationsByPerformance,
} from "@repo/utils/transformations";
import { validateLocation, validateMenuItem, validateSaleTransaction } from "@repo/utils/validation";

export default function BackofficeHomePage() {
  const referenceDate = new Date("2024-03-15T00:00:00");
  const wasteRecords: WasteRecord[] = [];

  const activeLocations = filterActiveLocations(sampleLocations);
  const sortedMenuByUsd = sortMenuItemsByPrice(sampleMenuItems, "USD", "desc");

  const dailyRevenueUSD = calculateDailyRevenue(sampleSales, referenceDate, "USD");
  const averageTicketUSD = calculateAverageTicket(sampleSales, "USD");
  const topSelling = findTopSellingItems(sampleSales, sampleMenuItems, 3);
  const countryComparison = calculateCountryComparison(sampleSales, sampleLocations, sampleMenuItems);
  const locationRanking = rankLocationsByPerformance(
    sampleLocations,
    sampleSales,
    wasteRecords,
    sampleMenuItems,
  );

  const sampleLocation = findLocationById(sampleLocations, "LOC-MEDELLIN-01");
  const sampleItem = findMenuItemByName(sampleMenuItems, "Picanha 250g");

  const isDataValid =
    sampleMenuItems.every((item) => validateMenuItem(item).valid) &&
    sampleSales.every((sale) => validateSaleTransaction(sale).valid) &&
    sampleLocations.every((location) => validateLocation(location).valid);

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
          Carga un CSV interno para validar registros corruptos, calcular métricas y exportar el resumen en formato CSV.
        </p>
        <a
          href="/backoffice/incidencias"
          className="mt-4 inline-flex rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-emerald-200"
        >
          Abrir analizador de incidencias
        </a>
      </section>

      <section id="dashboard" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Ingreso diario USD</p>
            <p className="mt-2 text-3xl font-extrabold text-cyan-300">${dailyRevenueUSD.toFixed(2)}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Ticket promedio USD</p>
            <p className="mt-2 text-3xl font-extrabold text-cyan-300">${averageTicketUSD.toFixed(2)}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Locaciones activas</p>
            <p className="mt-2 text-3xl font-extrabold text-cyan-300">{activeLocations.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Integridad de data</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-300">{isDataValid ? "OK" : "Error"}</p>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-xl font-bold text-white">Top items vendidos</h2>
            <ul className="mt-4 space-y-3">
              {topSelling.map((entry) => (
                <li key={entry.item.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                  <span className="text-slate-200">{entry.item.name}</span>
                  <span className="font-semibold text-cyan-300">{entry.totalSold} uds</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-xl font-bold text-white">Ranking de locaciones</h2>
            <ul className="mt-4 space-y-3">
              {locationRanking.map((entry) => (
                <li key={entry.location.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2">
                  <span className="text-slate-200">{entry.location.name}</span>
                  <span className="font-semibold text-orange-300">{entry.score}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-xl font-bold text-white">Comparativo por pais</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl bg-slate-800 p-3 text-slate-200">
                <p className="font-semibold text-cyan-300">Colombia</p>
                <p>Locaciones: {countryComparison.Colombia.totalLocations}</p>
                <p>Ventas: {countryComparison.Colombia.totalSales}</p>
                <p>Revenue USD: ${countryComparison.Colombia.totalRevenue.USD.toFixed(2)}</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-3 text-slate-200">
                <p className="font-semibold text-cyan-300">USA</p>
                <p>Locaciones: {countryComparison.USA.totalLocations}</p>
                <p>Ventas: {countryComparison.USA.totalSales}</p>
                <p>Revenue USD: ${countryComparison.USA.totalRevenue.USD.toFixed(2)}</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-xl font-bold text-white">Navegacion por data</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-200">
              <p>
                Locacion encontrada: <span className="font-semibold text-orange-300">{sampleLocation?.name ?? "No disponible"}</span>
              </p>
              <p>
                Item encontrado: <span className="font-semibold text-orange-300">{sampleItem?.name ?? "No disponible"}</span>
              </p>
              <div className="rounded-xl bg-slate-800 p-3">
                <p className="mb-2 font-semibold">Menu ordenado por precio (USD)</p>
                <ul className="space-y-1">
                  {sortedMenuByUsd.map((item) => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.name}</span>
                      <span className="text-cyan-300">${item.basePrice.USD.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
