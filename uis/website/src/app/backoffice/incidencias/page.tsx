"use client";

import { FormEvent, useMemo, useState } from "react";
import type { IncidentsAnalysisResult } from "@/lib/incidents-analyzer";
import { INCIDENTS_ALLOWED_CATEGORIES, INCIDENTS_ALLOWED_STATES, INCIDENTS_REQUIRED_FIELDS } from "@/lib/incidents-config";

interface AnalyzeApiResponse extends IncidentsAnalysisResult {
  export_csv: string;
  archivo: {
    nombre: string;
    tamanio_bytes: number;
  };
  error?: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(value);
}

export default function IncidenciasBackofficePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null);

  const sortedCategoryEntries = useMemo(
    () =>
      result
        ? Object.entries(result.resumen.incidencias_por_categoria).sort((a, b) => b[1] - a[1])
        : [],
    [result],
  );

  const sortedStateEntries = useMemo(
    () =>
      result
        ? Object.entries(result.resumen.incidencias_por_estado).sort((a, b) => b[1] - a[1])
        : [],
    [result],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Selecciona un archivo CSV para continuar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.set("file", file);

      const response = await fetch("/api/incidencias/analyze", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "No se pudo analizar el archivo.");
      }

      setResult(data);
    } catch (caughtError) {
      setResult(null);
      setError(caughtError instanceof Error ? caughtError.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  };

  const downloadSummary = () => {
    if (!result) {
      return;
    }

    const blob = new Blob([result.export_csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumen_incidencias.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-300/25 bg-gradient-to-br from-slate-950 via-emerald-950 to-orange-900 p-7 sm:p-10">
        <div className="absolute -right-16 top-0 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-orange-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Backoffice Postventa
          </p>
          <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
            Analizador interno de incidencias CSV
          </h1>
          <p className="text-sm text-slate-200 sm:text-base">
            Sube el fichero local para validar registros incompletos o corruptos y generar un resumen con métricas. Los
            registros inválidos se cuentan y quedan fuera del análisis principal.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-bold text-white">Carga de archivo</h2>
          <form className="mt-5 space-y-4" onSubmit={onSubmit}>
            <label className="block text-sm font-semibold text-slate-200" htmlFor="csv-file">
              Archivo CSV de incidencias
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
              }}
              className="block w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-300 file:px-4 file:py-2 file:font-semibold file:text-slate-900 hover:file:bg-emerald-200"
            />

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center rounded-xl bg-emerald-300 px-5 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Analizando..." : "Analizar archivo"}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/40 bg-red-900/30 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-5 space-y-3 rounded-2xl border border-emerald-300/30 bg-emerald-950/20 p-4 text-sm text-emerald-100">
              <p>
                Archivo: <span className="font-semibold">{result.archivo.nombre}</span>
              </p>
              <p>
                Tamaño: <span className="font-semibold">{formatNumber(result.archivo.tamanio_bytes)} bytes</span>
              </p>
              <p>
                Validación esperada (dataset de 100):{" "}
                <span className={`font-semibold ${result.validacion_esperada.coincide ? "text-emerald-200" : "text-amber-200"}`}>
                  {result.validacion_esperada.coincide ? "Coincide" : "No coincide"}
                </span>
              </p>
              <button
                type="button"
                onClick={downloadSummary}
                className="inline-flex rounded-lg border border-emerald-300/40 px-3 py-2 font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
              >
                Descargar resumen CSV
              </button>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-bold text-white">Contrato de validación</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-200">
            <div>
              <p className="font-semibold text-emerald-200">Campos obligatorios</p>
              <p>{INCIDENTS_REQUIRED_FIELDS.join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-200">Categorías válidas</p>
              <p>{INCIDENTS_ALLOWED_CATEGORIES.join(", ")}</p>
            </div>
            <div>
              <p className="font-semibold text-emerald-200">Estados válidos</p>
              <p>{INCIDENTS_ALLOWED_STATES.join(", ")}</p>
            </div>
          </div>
        </article>
      </section>

      {result && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Total registros</p>
              <p className="mt-2 text-3xl font-black text-emerald-300">{formatNumber(result.resumen.total_registros)}</p>
            </article>
            <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Registros válidos</p>
              <p className="mt-2 text-3xl font-black text-emerald-300">{formatNumber(result.resumen.registros_validos)}</p>
            </article>
            <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Registros inválidos</p>
              <p className="mt-2 text-3xl font-black text-rose-300">{formatNumber(result.resumen.registros_invalidos)}</p>
            </article>
            <article className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">% inválidos</p>
              <p className="mt-2 text-3xl font-black text-amber-300">{result.resumen.porcentaje_invalidos}%</p>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h3 className="text-lg font-bold text-white">Incidencias por categoría</h3>
              <ul className="mt-4 space-y-2">
                {sortedCategoryEntries.map(([category, count]) => (
                  <li key={category} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100">
                    <span>{category}</span>
                    <span className="font-semibold text-emerald-300">{count}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h3 className="text-lg font-bold text-white">Incidencias por estado</h3>
              <ul className="mt-4 space-y-2">
                {sortedStateEntries.map(([state, count]) => (
                  <li key={state} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-100">
                    <span>{state}</span>
                    <span className="font-semibold text-emerald-300">{count}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-bold text-white">Registros inválidos detectados</h3>
            {result.invalidos.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-200">No se detectaron registros inválidos.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] table-auto text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-300">
                      <th className="px-3 py-2">Línea</th>
                      <th className="px-3 py-2">Incidente</th>
                      <th className="px-3 py-2">Errores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.invalidos.map((item) => (
                      <tr key={`${item.linea_csv}-${item.incidente_id}`} className="border-b border-slate-800">
                        <td className="px-3 py-2 text-slate-200">{item.linea_csv}</td>
                        <td className="px-3 py-2 text-slate-200">{item.incidente_id || "(sin ID)"}</td>
                        <td className="px-3 py-2 text-rose-200">{item.errores.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      )}
    </main>
  );
}
