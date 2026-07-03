import {
  type Location,
  type MenuItem,
  type SaleTransaction,
  type WasteRecord,
} from "@repo/types/model";
import {
  filterActiveLocations,
  sortLocationsByCapacity,
} from "@repo/utils/collections";
import { findLocationById } from "@repo/utils/search";
import {
  calculateAverageTicket,
  calculateCountryComparison,
  calculateDailyRevenue,
  countSalesByPaymentMethod,
  findTopSellingItems,
} from "@repo/utils/transformations";
import { validateLocation } from "@repo/utils/validation";

const locations: Location[] = [
  {
    id: "LOC-MED-01",
    name: "Brasaland Laureles",
    city: "Medellin",
    country: "Colombia",
    openingYear: 2016,
    seatingCapacity: 82,
    staffCount: 17,
    monthlyRentCost: { USD: 2200, COP: 8800000 },
    averageMonthlyUtilities: { USD: 650, COP: 2600000 },
    manager: "Ana Torres",
    status: "Active",
  },
  {
    id: "LOC-MIA-01",
    name: "Brasaland Miami West",
    city: "Miami",
    country: "USA",
    openingYear: 2021,
    seatingCapacity: 96,
    staffCount: 22,
    monthlyRentCost: { USD: 6400, COP: 25600000 },
    averageMonthlyUtilities: { USD: 1800, COP: 7200000 },
    manager: "Carlos Vega",
    status: "Active",
  },
  {
    id: "LOC-BOG-01",
    name: "Brasaland Chico",
    city: "Bogota",
    country: "Colombia",
    openingYear: 2019,
    seatingCapacity: 74,
    staffCount: 16,
    monthlyRentCost: { USD: 3000, COP: 12000000 },
    averageMonthlyUtilities: { USD: 700, COP: 2800000 },
    manager: "Luisa Marin",
    status: "Temporarily closed",
  },
];

const menuItems: MenuItem[] = [
  {
    id: "ITEM-PICANHA-250",
    name: "Picanha 250g",
    category: "Meat",
    basePrice: { USD: 22, COP: 88000 },
    ingredientCost: { USD: 8.5, COP: 34000 },
    prepTimeMinutes: 18,
    isAvailableInColombia: true,
    isAvailableInUSA: true,
    allergens: [],
    status: "Active",
  },
  {
    id: "ITEM-YUCA-FRITA",
    name: "Yuca frita",
    category: "Side",
    basePrice: { USD: 6, COP: 24000 },
    ingredientCost: { USD: 1.4, COP: 5600 },
    prepTimeMinutes: 9,
    isAvailableInColombia: true,
    isAvailableInUSA: false,
    allergens: [],
    status: "Active",
  },
  {
    id: "ITEM-MARACUYA",
    name: "Jugo de maracuya",
    category: "Beverage",
    basePrice: { USD: 4, COP: 16000 },
    ingredientCost: { USD: 0.9, COP: 3600 },
    prepTimeMinutes: 4,
    isAvailableInColombia: true,
    isAvailableInUSA: true,
    allergens: [],
    status: "Seasonal",
  },
];

const sales: SaleTransaction[] = [
  {
    id: "TXN-001",
    locationId: "LOC-MED-01",
    itemId: "ITEM-PICANHA-250",
    quantity: 3,
    totalPrice: { USD: 66, COP: 264000 },
    paymentMethod: "Credit card",
    timestamp: new Date("2026-06-20T14:21:00"),
    waiterName: "Laura",
  },
  {
    id: "TXN-002",
    locationId: "LOC-MED-01",
    itemId: "ITEM-YUCA-FRITA",
    quantity: 4,
    totalPrice: { USD: 24, COP: 96000 },
    paymentMethod: "Cash",
    timestamp: new Date("2026-06-20T15:10:00"),
    waiterName: "Diego",
  },
  {
    id: "TXN-003",
    locationId: "LOC-MIA-01",
    itemId: "ITEM-PICANHA-250",
    quantity: 2,
    totalPrice: { USD: 44, COP: 176000 },
    paymentMethod: "Digital wallet",
    timestamp: new Date("2026-06-20T16:45:00"),
    waiterName: "Monica",
  },
  {
    id: "TXN-004",
    locationId: "LOC-MIA-01",
    itemId: "ITEM-MARACUYA",
    quantity: 5,
    totalPrice: { USD: 20, COP: 80000 },
    paymentMethod: "Debit card",
    timestamp: new Date("2026-06-20T18:15:00"),
    waiterName: "Rafael",
  },
];

const wasteRecords: WasteRecord[] = [];

function money(value: number, currency: "USD" | "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function Home() {
  const activeLocations = filterActiveLocations(locations);
  const byCapacity = sortLocationsByCapacity(activeLocations, "desc");
  const medellinLocation = findLocationById(locations, "LOC-MED-01");

  const today = new Date("2026-06-20T00:00:00");
  const revenueUSD = calculateDailyRevenue(sales, today, "USD");
  const averageTicketUSD = calculateAverageTicket(sales, "USD");
  const paymentCounts = countSalesByPaymentMethod(sales);
  const topItems = findTopSellingItems(sales, menuItems, 3);
  const byCountry = calculateCountryComparison(sales, locations, menuItems);

  const validation = medellinLocation
    ? validateLocation(medellinLocation)
    : { valid: false, errors: ["Locacion no encontrada"] };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]/85 p-8 shadow-xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          Brasaland Internal Hub
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Bienvenido al Backoffice
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Esta ruta es independiente del sitio publico y consume la logica de
          negocio desde src/types y src/utils del monorepo sin duplicar codigo.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] p-4">
          <p className="text-sm text-[var(--muted)]">Ingresos del dia (USD)</p>
          <p className="mt-2 text-2xl font-bold">{money(revenueUSD, "USD")}</p>
        </article>
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] p-4">
          <p className="text-sm text-[var(--muted)]">Ticket promedio</p>
          <p className="mt-2 text-2xl font-bold">
            {money(averageTicketUSD, "USD")}
          </p>
        </article>
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] p-4">
          <p className="text-sm text-[var(--muted)]">Locaciones activas</p>
          <p className="mt-2 text-2xl font-bold">{activeLocations.length}</p>
        </article>
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-alt)] p-4">
          <p className="text-sm text-[var(--muted)]">Top capacidad</p>
          <p className="mt-2 text-2xl font-bold">{byCapacity[0]?.name}</p>
        </article>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold">Ventas por metodo de pago</h2>
          <ul className="mt-4 space-y-2 text-[var(--muted)]">
            <li>Efectivo: {paymentCounts.Cash ?? 0}</li>
            <li>Tarjeta credito: {paymentCounts["Credit card"] ?? 0}</li>
            <li>Tarjeta debito: {paymentCounts["Debit card"] ?? 0}</li>
            <li>Billetera digital: {paymentCounts["Digital wallet"] ?? 0}</li>
          </ul>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold">Top items vendidos</h2>
          <ul className="mt-4 space-y-2 text-[var(--muted)]">
            {topItems.map((entry) => (
              <li key={entry.item.id}>
                {entry.item.name}: {entry.totalSold} unidades
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold">Comparativo por pais</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-[var(--line)] p-4">
            <p className="text-sm text-[var(--muted)]">Colombia</p>
            <p className="mt-2">Ventas: {byCountry.Colombia.totalSales}</p>
            <p>Ingresos: {money(byCountry.Colombia.totalRevenue.USD, "USD")}</p>
          </div>
          <div className="rounded-lg border border-[var(--line)] p-4">
            <p className="text-sm text-[var(--muted)]">USA</p>
            <p className="mt-2">Ventas: {byCountry.USA.totalSales}</p>
            <p>Ingresos: {money(byCountry.USA.totalRevenue.USD, "USD")}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--accent-soft)]/40 p-5">
        <h2 className="text-lg font-semibold">Validacion de datos de locacion</h2>
        <p className="mt-3 text-[var(--muted)]">
          Resultado para LOC-MED-01: {validation.valid ? "Valido" : "Con errores"}
        </p>
        {!validation.valid && (
          <ul className="mt-2 list-disc pl-5 text-sm text-rose-300">
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-sm text-[var(--muted)]">
        Waste records cargados: {wasteRecords.length}
      </p>
    </main>
  );
}
