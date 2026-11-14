"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BRANCHES, CATEGORIES, ORIGINS, STATUSES, statusLabels, categoryLabels, originLabels, branchLabels } from "@/lib/incidents-manager";
import {
  type IncidentForm,
  EMPTY_FORM,
  errorFrom,
  json,
  Badge,
  NEXT,
} from "@/lib/incidents-shared";

type Status = (typeof STATUSES)[number][0];
type Origin = (typeof ORIGINS)[number][0];
type Branch = (typeof BRANCHES)[number][0];
type Category = (typeof CATEGORIES)[number][0];
type Incident = {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  origin: Origin;
  branch: Branch;
  created_at: string;
  updated_at: string;
};
type Summary = {
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
};

export default function IncidentsClient({ initialItems, initialSummary }: { initialItems: Incident[]; initialSummary: Summary | null }) {
  const [items, setItems] = useState<Incident[]>(initialItems);
  const [summary, setSummary] = useState<Summary | null>(initialSummary);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState<{ status: "" | Status; origin: "" | Origin; branch: "" | Branch }>({ status: "", origin: "", branch: "" });
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const query = useMemo(() => { const p = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) p.set(key, value); }); return p.toString(); }, [filters]);

  const loadList = useCallback(async () => {
    setLoading(true); setListError(null);
    try { const response = await fetch(`/api/incidents${query ? `?${query}` : ""}`); const payload = await json(response); if (!response.ok || !Array.isArray(payload)) throw new Error(); setItems(payload as Incident[]); }
    catch { setListError("No se pudo cargar el listado de incidencias. Comprueba la conexión y vuelve a intentarlo."); }
    finally { setLoading(false); }
  }, [query]);
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError(null);
    try { const response = await fetch("/api/incidents/summary"); const payload = await json(response); if (!response.ok || !payload || typeof payload !== "object") throw new Error(); setSummary(payload as Summary); }
    catch { setSummaryError("No se pudieron cargar las métricas. Puedes reintentarlo sin perder el listado."); }
    finally { setSummaryLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadList(), 0); return () => window.clearTimeout(timer); }, [loadList]);
  useEffect(() => { const timer = window.setTimeout(() => void loadSummary(), 0); return () => window.clearTimeout(timer); }, [loadSummary]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setFormErrors({}); setNotice(null);
    try {
      const response = await fetch("/api/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await json(response);
      if (!response.ok) { const error = errorFrom(payload); setFormErrors({ [error.field ?? "form"]: error.message }); return; }
      setForm(EMPTY_FORM); setNotice("Incidencia registrada correctamente. Ya está disponible para seguimiento."); await Promise.all([loadList(), loadSummary()]);
    } catch { setFormErrors({ form: "No pudimos registrar la incidencia. Comprueba la conexión e inténtalo de nuevo." }); }
    finally { setSaving(false); }
  }
  async function changeStatus(item: Incident, next: Status) {
    const previous = item.status; setUpdating(item.id); setUpdateError(null); setItems((all) => all.map((current) => current.id === item.id ? { ...current, status: next } : current));
    try { const response = await fetch(`/api/incidents/${item.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) }); if (!response.ok) throw new Error(); await loadSummary(); }
    catch { setItems((all) => all.map((current) => current.id === item.id ? { ...current, status: previous } : current)); setUpdateError("No se pudo actualizar el estado. La incidencia conserva su estado anterior."); }
    finally { setUpdating(null); }
  }
  const groups = summary ? [["Por estado", summary.by_status, statusLabels], ["Por categoría", summary.by_category, categoryLabels], ["Por origen", summary.by_origin, originLabels], ["Por sede", summary.by_branch, branchLabels]] as const : [];
  const fieldClass = "mt-1 min-h-12 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-slate-100 focus:border-orange-300 focus:outline-none";

  return <main className="space-y-7 pb-12">
    <section className="relative overflow-hidden rounded-3xl border border-orange-300/25 bg-gradient-to-br from-slate-950 via-orange-950 to-slate-900 p-7 sm:p-10"><div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-300 via-orange-500 to-rose-500" /><p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-200">Operaciones · Brasaland</p><h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">Incidencias, a la vista antes de que se enfríen.</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Registra lo que ocurre en cada sede y mueve cada caso por su ciclo de resolución desde una misma consola.</p></section>

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">Pulso operativo</p><h2 className="mt-1 text-xl font-bold text-white">Resumen de incidencias</h2></div><button type="button" onClick={() => void loadSummary()} disabled={summaryLoading} className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-orange-300 disabled:opacity-60">Actualizar métricas</button></div><div className="mt-5 min-h-24">{summaryLoading ? <p className="text-sm text-slate-300">Cargando métricas operativas…</p> : summaryError ? <div className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-sm text-rose-100"><p>{summaryError}</p><button type="button" onClick={() => void loadSummary()} className="mt-2 font-bold underline">Reintentar</button></div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{groups.map(([title, values, labels]) => <article key={title} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4"><h3 className="text-sm font-bold text-white">{title}</h3><dl className="mt-3 space-y-2">{Object.entries(values).map(([key, value]) => <div key={key} className="flex justify-between gap-3 text-xs"><dt className="text-slate-300">{labels[key] ?? key}</dt><dd className="font-mono font-bold text-orange-200">{value}</dd></div>)}</dl></article>)}</div>}</div></section>

    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">Cola de trabajo</p><h2 className="mt-1 text-xl font-bold text-white">Listado de incidencias</h2></div><button type="button" onClick={() => void loadList()} className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-orange-300">Reintentar carga</button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold text-slate-200">Estado<select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as "" | Status }))} className={fieldClass}><option value="">Todos los estados</option>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><label className="text-sm font-semibold text-slate-200">Origen<select value={filters.origin} onChange={(e) => setFilters((f) => ({ ...f, origin: e.target.value as "" | Origin }))} className={fieldClass}><option value="">Todos los orígenes</option>{ORIGINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><label className="text-sm font-semibold text-slate-200">Sede<select value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value as "" | Branch }))} className={fieldClass}><option value="">Todas las sedes</option>{BRANCHES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label></div><div className="mt-4 min-h-12">{updateError && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-sm text-rose-100">{updateError}</p>}</div><div className="mt-6 min-h-24">{loading ? <p className="text-sm text-slate-300">Cargando incidencias…</p> : listError ? <div className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-100"><p>{listError}</p><button type="button" onClick={() => void loadList()} className="mt-2 font-bold underline">Reintentar</button></div> : <ul role="list" className="space-y-3">{items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">{item.title}</p><div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400"><span>{branchLabels[item.branch] ?? item.branch}</span><span aria-hidden="true">·</span><span>{categoryLabels[item.category] ?? item.category}</span><span aria-hidden="true">·</span><span>{originLabels[item.origin] ?? item.origin}</span></div></div><div className="flex shrink-0 items-center gap-2"><Badge value={item.status} />{NEXT[item.status].length ? <select value="" onChange={(e) => { if (e.target.value) void changeStatus(item, e.target.value as Status); }} disabled={updating === item.id} className="min-h-9 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:border-orange-300 focus:outline-none disabled:opacity-50"><option value="">Mover a…</option>{NEXT[item.status].map((next) => <option key={next} value={next}>{statusLabels[next]}</option>)}</select> : <span className="min-h-9 inline-flex items-center rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-slate-400">Estado final</span>}</div></li>)}</ul>}</div></section>

    <section className="rounded-2xl border border-orange-300/25 bg-slate-900 p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-200">Nuevo reporte</p><h2 className="mt-1 text-xl font-bold text-white">Registrar incidencia</h2><p className="mt-2 text-sm text-slate-300">Los campos de identificación y fechas se generan al guardar. Completa la información operativa.</p></div><div className="mt-4 min-h-12" aria-live="polite">{notice && <p role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-950/30 p-3 text-sm text-emerald-100">{notice}</p>}{!notice && formErrors.form && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-sm text-rose-100">{formErrors.form}</p>}</div><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => void create(e)}><label className="text-sm font-semibold text-slate-200">Título<input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={fieldClass} />{formErrors.title && <span className="mt-1 block text-xs text-rose-200">{formErrors.title}</span>}</label><label className="text-sm font-semibold text-slate-200">Categoría<select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))} className={fieldClass}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{formErrors.category && <span className="mt-1 block text-xs text-rose-200">{formErrors.category}</span>}</label><label className="sm:col-span-2 text-sm font-semibold text-slate-200">Descripción<textarea required rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-slate-100 focus:border-orange-300 focus:outline-none" />{formErrors.description && <span className="mt-1 block text-xs text-rose-200">{formErrors.description}</span>}</label><label className="text-sm font-semibold text-slate-200">Origen<select value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value as Origin }))} className={fieldClass}>{ORIGINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{formErrors.origin && <span className="mt-1 block text-xs text-rose-200">{formErrors.origin}</span>}</label><label className="text-sm font-semibold text-slate-200">Sede<select value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value as Branch }))} className={fieldClass}>{BRANCHES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{formErrors.branch && <span className="mt-1 block text-xs text-rose-200">{formErrors.branch}</span>}</label><div className="sm:col-span-2 flex justify-end"><button type="submit" disabled={saving} className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-400 disabled:opacity-60">{saving ? "Guardando…" : "Registrar incidencia"}</button></div></form></section>
  </main>;
}