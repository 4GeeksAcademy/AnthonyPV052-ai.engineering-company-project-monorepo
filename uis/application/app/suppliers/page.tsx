"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_SUPPLIERS_API_URL ?? "http://127.0.0.1:8020";

const VALID_CATEGORIES = [
  "carne",
  "verduras_y_hortalizas",
  "salsas_y_condimentos",
  "bebidas",
  "packaging",
  "productos_limpieza",
  "lacteos",
  "carbon_y_combustible",
] as const;

type SupplierStatus = "active" | "suspended";
type SupplierCountry = "Colombia" | "USA";
type SupplierCurrency = "COP" | "USD";

interface Supplier {
  id: number;
  name: string;
  country: SupplierCountry;
  categories: string[];
  rate_per_unit: number;
  currency: SupplierCurrency;
  updated_at: string;
  status: SupplierStatus;
  contact_email?: string | null;
  notes?: string | null;
}

interface SupplierCreateForm {
  name: string;
  country: SupplierCountry;
  categories: string[];
  rate_per_unit: string;
  currency: SupplierCurrency;
  status: SupplierStatus;
  contact_email: string;
  notes: string;
}

const EMPTY_FORM: SupplierCreateForm = {
  name: "",
  country: "Colombia",
  categories: ["carne"],
  rate_per_unit: "",
  currency: "COP",
  status: "active",
  contact_email: "",
  notes: "",
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const messages: Record<number, string> = {
      400: "Revisa los datos enviados e inténtalo de nuevo.",
      401: "Tu sesión ha caducado. Inicia sesión de nuevo.",
      403: "No tienes permiso para realizar esta acción.",
      404: "El proveedor ya no está disponible. Actualiza el listado.",
      409: "El proveedor ya existe o tiene datos incompatibles.",
      422: "Algunos datos no son válidos. Revisa el formulario.",
    };
    throw new Error(messages[response.status] ?? "No se pudo completar la operación. Inténtalo de nuevo.");
  }

  return (await response.json()) as T;
}

function StatusBadge({ status }: { status: SupplierStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        status === "active"
          ? "bg-emerald-300/20 text-emerald-200"
          : "bg-rose-300/20 text-rose-200"
      }`}
    >
      {status}
    </span>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [countryFilter, setCountryFilter] = useState<"" | SupplierCountry>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierCreateForm>(EMPTY_FORM);
  const [rateDrafts, setRateDrafts] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [updatingSupplier, setUpdatingSupplier] = useState<number | null>(null);

  const path = useMemo(() => {
    const params = new URLSearchParams();
    if (countryFilter) params.set("country", countryFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    return params.toString() ? `/suppliers?${params.toString()}` : "/suppliers";
  }, [countryFilter, categoryFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function fetchSuppliers() {
      try {
        const data = await apiFetch<Supplier[]>(path);
        if (!active) return;
        setSuppliers(data);
        setError(null);
      } catch (caughtError) {
        if (!active) return;
        setError("No se pudieron cargar los proveedores. Comprueba tu conexión e inténtalo de nuevo.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchSuppliers();
    return () => {
      active = false;
    };
  }, [path]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.rate_per_unit.trim() || form.categories.length === 0) {
      setError("Completa los campos requeridos: nombre, categoría y tarifa.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      await apiFetch<Supplier>("/supplier", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          rate_per_unit: Number(form.rate_per_unit),
          contact_email: form.contact_email.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      setMessage("Proveedor creado correctamente.");
      setForm({ ...EMPTY_FORM, country: form.country, currency: form.currency });
      const data = await apiFetch<Supplier[]>(path);
      setSuppliers(data);
    } catch (caughtError) {
      setError("No se pudo crear el proveedor. Revisa los datos e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdateRate = async (supplier: Supplier) => {
    const draft = rateDrafts[supplier.id];
    if (!draft || Number(draft) <= 0) {
      setError("La tarifa debe ser mayor que cero.");
      return;
    }

    setError(null);
    setMessage(null);
    setUpdatingSupplier(supplier.id);
    try {
      await apiFetch<Supplier>(`/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        body: JSON.stringify({ rate_per_unit: Number(draft) }),
      });
      setMessage("Tarifa actualizada correctamente.");
      const data = await apiFetch<Supplier[]>(path);
      setSuppliers(data);
    } catch (caughtError) {
      setError("No se pudo actualizar la tarifa. Comprueba los datos e inténtalo de nuevo.");
    } finally {
      setUpdatingSupplier(null);
    }
  };

  const onToggleStatus = async (supplier: Supplier) => {
    const nextStatus: SupplierStatus = supplier.status === "active" ? "suspended" : "active";
    setError(null);
    setMessage(null);
    setUpdatingSupplier(supplier.id);
    try {
      await apiFetch<Supplier>(`/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setMessage(`Estado actualizado a ${nextStatus === "active" ? "activo" : "suspendido"}.`);
      const data = await apiFetch<Supplier[]>(path);
      setSuppliers(data);
    } catch (caughtError) {
      setError("No se pudo actualizar el estado. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setUpdatingSupplier(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 text-slate-100">
      <h1 className="text-3xl font-black">Directorio de proveedores</h1>

      <section className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          País
          <select
            value={countryFilter}
            onChange={(event) => setCountryFilter(event.target.value as "" | SupplierCountry)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2"
          >
            <option value="">Todos</option>
            <option value="Colombia">Colombia</option>
            <option value="USA">USA</option>
          </select>
        </label>

        <label className="text-sm">
          Categoría
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 p-2"
          >
            <option value="">Todas</option>
            {VALID_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm">
          <p className="mt-7">{loading ? "Cargando..." : `Resultados: ${suppliers.length}`}</p>
        </div>
      </section>

      {message && <p className="rounded bg-emerald-700/30 p-2 text-sm">{message}</p>}
      {error && <div role="alert" className="rounded bg-rose-700/30 p-2 text-sm"><p>{error}</p><button type="button" disabled={loading} onClick={() => window.location.reload()} className="mt-2 font-semibold underline disabled:opacity-60">{loading ? "Cargando…" : "Reintentar carga"}</button></div>}

      <section className="overflow-x-auto rounded border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">País</th>
              <th className="px-3 py-2">Categorías</th>
              <th className="px-3 py-2">Tarifa</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="border-t border-slate-800">
                <td className="px-3 py-2">{supplier.name || "Nombre no disponible"}</td>
                <td className="px-3 py-2">{supplier.country}</td>
                <td className="px-3 py-2">{Array.isArray(supplier.categories) && supplier.categories.length ? supplier.categories.join(", ") : "Sin categorías"}</td>
                <td className="px-3 py-2">{supplier.rate_per_unit ?? "No disponible"} {supplier.currency ?? ""}</td>
                <td className="px-3 py-2"><StatusBadge status={supplier.status === "suspended" ? "suspended" : "active"} /></td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={rateDrafts[supplier.id] ?? ""}
                        onChange={(event) => setRateDrafts((prev) => ({ ...prev, [supplier.id]: event.target.value }))}
                        className="w-28 rounded border border-slate-700 bg-slate-900 p-1"
                      />
                      <button
                        type="button"
                        onClick={() => void onUpdateRate(supplier)}
                        disabled={updatingSupplier === supplier.id}
                        className="rounded bg-cyan-300 px-2 py-1 text-slate-900"
                      >
                        {updatingSupplier === supplier.id ? "Guardando…" : "Tarifa"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onToggleStatus(supplier)}
                      disabled={updatingSupplier === supplier.id}
                      className="rounded border border-slate-600 px-2 py-1"
                    >
                      {supplier.status === "active" ? "Suspender" : "Activar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded border border-slate-800 p-4">
        <h2 className="text-xl font-bold">Registrar proveedor</h2>
        <form onSubmit={(event) => void onCreate(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Nombre"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded border border-slate-700 bg-slate-900 p-2"
          />
          <select
            value={form.country}
            onChange={(event) => {
              const country = event.target.value as SupplierCountry;
              setForm((prev) => ({ ...prev, country, currency: country === "Colombia" ? "COP" : "USD" }));
            }}
            className="rounded border border-slate-700 bg-slate-900 p-2"
          >
            <option value="Colombia">Colombia</option>
            <option value="USA">USA</option>
          </select>
          <select
            value={form.categories[0]}
            onChange={(event) => setForm((prev) => ({ ...prev, categories: [event.target.value] }))}
            className="rounded border border-slate-700 bg-slate-900 p-2"
          >
            {VALID_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Tarifa por unidad"
            value={form.rate_per_unit}
            onChange={(event) => setForm((prev) => ({ ...prev, rate_per_unit: event.target.value }))}
            className="rounded border border-slate-700 bg-slate-900 p-2"
          />
          <input
            type="email"
            placeholder="Email contacto"
            value={form.contact_email}
            onChange={(event) => setForm((prev) => ({ ...prev, contact_email: event.target.value }))}
            className="rounded border border-slate-700 bg-slate-900 p-2"
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as SupplierStatus }))}
            className="rounded border border-slate-700 bg-slate-900 p-2"
          >
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
          <textarea
            placeholder="Notas"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            className="sm:col-span-2 rounded border border-slate-700 bg-slate-900 p-2"
          />
          <button type="submit" disabled={submitting} className="w-fit rounded bg-emerald-300 px-4 py-2 font-semibold text-slate-900 disabled:opacity-60">
            {submitting ? "Creando…" : "Crear proveedor"}
          </button>
        </form>
      </section>
    </main>
  );
}
