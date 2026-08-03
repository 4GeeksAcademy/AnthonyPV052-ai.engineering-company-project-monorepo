"use client";

import { FormEvent, useMemo, useState } from "react";

interface AnalysisSummary {
  total_procesados: number;
  registros_validos: number;
  registros_invalidos: number;
  total_por_categoria: Record<string, number>;
  total_por_estado: Record<string, number>;
  indice_satisfaccion_medio_cerrados: number | null;
}

interface AnalyzeApiResponse {
  resumen: AnalysisSummary;
  invalidos_por_tipo: Record<string, number>;
  invalidos: Array<{
    linea_csv: number;
    incidente_id: string;
    motivos: string[];
  }>;
  validacion_esperada: {
    coincide: boolean;
    diferencias: string[];
  };
  archivo: {
    nombre: string;
    tamanio_bytes: number;
  };
  error?: string;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-ES").format(value);
}

export default function IncidentsBackofficePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null);

  const categories = useMemo(
    () =>
      result
        ? Object.entries(result.resumen.total_por_categoria).sort((a, b) => b[1] - a[1])
        : [],
    [result],
  );

  const states = useMemo(
    () =>
      result
        ? Object.entries(result.resumen.total_por_estado).sort((a, b) => b[1] - a[1])
        : [],
    [result],
  );

  const invalidByType = useMemo(
    () =>
      result
        ? Object.entries(result.invalidos_por_tipo).sort((a, b) => b[1] - a[1])
        : [],
    [result],
  );

  const onAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Selecciona un fichero CSV para analizar.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.set("file", file);

      const response = await fetch("/api/incidents/analyze", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error ?? "No se pudo analizar el fichero.");
      }

      setResult(data);
    } catch (caughtError) {
      setResult(null);
      setError(caughtError instanceof Error ? caughtError.message : "Error desconocido.");
    } finally {
      setLoading(false);
    }
  };

  const onDownload = async () => {
    try {
      const response = await fetch("/api/incidents/results/export", {
        method: "GET",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "No hay resultados disponibles para descargar.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "results.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Error al descargar el CSV.");
    }
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
            Análisis de incidencias CSV
          </h1>
          <p className="text-sm text-slate-200 sm:text-base">
            Sube un fichero CSV interno para validar registros y obtener métricas del servicio postventa.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-bold text-white">Carga de fichero</h2>

          <form className="mt-5 space-y-4" onSubmit={onAnalyze}>
            <label className="block text-sm font-semibold text-slate-200" htmlFor="csv-file">
              Fichero CSV de incidencias
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-300 file:px-4 file:py-2 file:font-semibold file:text-slate-900 hover:file:bg-emerald-200"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center rounded-xl bg-emerald-300 px-5 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Analizando..." : "Analizar fichero"}
              </button>

              <button
                type="button"
                onClick={onDownload}
                className="inline-flex h-11 items-center rounded-xl border border-emerald-300/60 px-5 text-sm font-bold uppercase tracking-wide text-emerald-200 transition hover:bg-emerald-400/10"
              >
                Descargar results.csv
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/40 bg-red-900/30 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-5 space-y-2 rounded-2xl border border-emerald-300/30 bg-emerald-950/20 p-4 text-sm text-emerald-100">
              <p>
                Archivo: <span className="font-semibold">{result.archivo.nombre}</span>
              </p>
              <p>
                Tamaño: <span className="font-semibold">{formatNumber(result.archivo.tamanio_bytes)} bytes</span>
              </p>
              <p>
                Validación esperada: <span className="font-semibold">{result.validacion_esperada.coincide ? "Coincide" : "No coincide"}</span>
              </p>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <h2 className="text-xl font-bold text-white">Métricas generales</h2>
          {result ? (
            <div className="mt-4 grid gap-3 text-sm text-slate-200">
              <p>Total procesados: <span className="font-semibold text-emerald-200">{result.resumen.total_procesados}</span></p>
              <p>Registros válidos: <span className="font-semibold text-emerald-200">{result.resumen.registros_validos}</span></p>
              <p>Registros inválidos: <span className="font-semibold text-rose-200">{result.resumen.registros_invalidos}</span></p>
              <p>Índice satisfacción medio (cerrados): <span className="font-semibold text-emerald-200">{result.resumen.indice_satisfaccion_medio_cerrados ?? "N/A"}</span></p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">Aún no hay resultados de análisis.</p>
          )}
        </article>
      </section>

      {result && (
        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-bold text-white">Desglose por categoría</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {categories.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-slate-100">
                  <span>{name}</span>
                  <span className="font-semibold text-emerald-300">{count}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-bold text-white">Desglose por estado</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {states.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-slate-100">
                  <span>{name}</span>
                  <span className="font-semibold text-emerald-300">{count}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h3 className="text-lg font-bold text-white">Inválidos por tipo</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {invalidByType.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-slate-100">
                  <span>{name}</span>
                  <span className="font-semibold text-rose-300">{count}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>
      )}
    </main>
  );
}
