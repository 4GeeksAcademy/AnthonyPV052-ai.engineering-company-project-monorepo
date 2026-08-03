import {
  INCIDENTS_ALLOWED_CATEGORIES,
  INCIDENTS_ALLOWED_STATES,
  INCIDENTS_EXPECTED_SUMMARY,
  INCIDENTS_REQUIRED_FIELDS,
} from "@/lib/incidents-config";
import { parseCsv } from "@/lib/incidents-analyzer";

export interface InvalidIncidentRow {
  linea_csv: number;
  incidente_id: string;
  motivos: string[];
}

export interface IncidentsSummary {
  total_procesados: number;
  registros_validos: number;
  registros_invalidos: number;
  total_por_categoria: Record<string, number>;
  total_por_estado: Record<"abierto" | "cerrado" | "descartado", number>;
  total_por_estado_completo: Record<string, number>;
  indice_satisfaccion_medio_cerrados: number | null;
  tiempo_promedio_resolucion_horas: number | null;
}

export interface IncidentsAnalysisResponse {
  contexto: {
    required_fields: readonly string[];
    allowed_categories: readonly string[];
    allowed_states: readonly string[];
  };
  resumen: IncidentsSummary;
  invalidos: InvalidIncidentRow[];
  invalidos_por_tipo: Record<string, number>;
  validacion_esperada: {
    coincide: boolean;
    diferencias: string[];
  };
}

export class AnalyzeInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AnalyzeInputError";
    this.status = status;
  }
}

function parseNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function isValidIsoDate(value: string): boolean {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!match) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function countBy(items: string[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
}

function detectSatisfactionField(headers: string[]): string | null {
  const candidates = [
    "indice_satisfaccion",
    "satisfaccion",
    "puntuacion_satisfaccion",
    "score_satisfaccion",
  ];

  const loweredMap = new Map(headers.map((header) => [header.toLowerCase(), header]));

  for (const candidate of candidates) {
    const original = loweredMap.get(candidate);
    if (original) {
      return original;
    }
  }

  return null;
}

function compareExpected(summary: IncidentsSummary): string[] {
  const mismatches: string[] = [];
  const aliasPairs: Array<[keyof typeof INCIDENTS_EXPECTED_SUMMARY, keyof IncidentsSummary]> = [
    ["total_registros", "total_procesados"],
    ["registros_validos", "registros_validos"],
    ["registros_invalidos", "registros_invalidos"],
    ["tiempo_promedio_resolucion_horas", "tiempo_promedio_resolucion_horas"],
  ];

  aliasPairs.forEach(([expectedKey, summaryKey]) => {
    if (INCIDENTS_EXPECTED_SUMMARY[expectedKey] !== summary[summaryKey]) {
      mismatches.push(
        `${String(expectedKey)}: esperado=${String(INCIDENTS_EXPECTED_SUMMARY[expectedKey])} actual=${String(summary[summaryKey])}`,
      );
    }
  });

  Object.entries(INCIDENTS_EXPECTED_SUMMARY.incidencias_por_categoria).forEach(([key, expectedValue]) => {
    const actual = summary.total_por_categoria[key] ?? 0;
    if (actual !== expectedValue) {
      mismatches.push(`incidencias_por_categoria.${key}: esperado=${expectedValue} actual=${actual}`);
    }
  });

  Object.entries(INCIDENTS_EXPECTED_SUMMARY.incidencias_por_estado).forEach(([key, expectedValue]) => {
    const actual = summary.total_por_estado_completo[key] ?? 0;
    if (actual !== expectedValue) {
      mismatches.push(`incidencias_por_estado.${key}: esperado=${expectedValue} actual=${actual}`);
    }
  });

  return mismatches;
}

function toRowsWithHeaders(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new AnalyzeInputError("El fichero CSV está vacío.", 400);
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    throw new AnalyzeInputError("Formato CSV incorrecto: cabecera inválida.", 422);
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new AnalyzeInputError("El fichero no contiene registros para analizar.", 400);
  }

  return { headers, rows };
}

function buildResultsCsv(summary: IncidentsSummary, invalidByType: Record<string, number>, matchesExpected: boolean): string {
  const lines: string[] = ["metrica,valor"];

  lines.push(`total_procesados,${summary.total_procesados}`);
  lines.push(`registros_validos,${summary.registros_validos}`);
  lines.push(`registros_invalidos,${summary.registros_invalidos}`);
  lines.push(
    `indice_satisfaccion_medio_cerrados,${summary.indice_satisfaccion_medio_cerrados ?? ""}`,
  );

  Object.entries(summary.total_por_categoria)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => lines.push(`categoria:${key},${value}`));

  Object.entries(summary.total_por_estado)
    .forEach(([key, value]) => lines.push(`estado:${key},${value}`));

  Object.entries(invalidByType)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => lines.push(`invalido:${key},${value}`));

  lines.push(`coincide_con_expected,${matchesExpected ? "si" : "no"}`);
  return `${lines.join("\n")}\n`;
}

export function analyzeIncidentsCsv(csvText: string): { result: IncidentsAnalysisResponse; csvExport: string } {
  if (!csvText.trim()) {
    throw new AnalyzeInputError("El fichero CSV está vacío.", 400);
  }

  const { rows, headers } = toRowsWithHeaders(csvText);

  const missingHeaders = INCIDENTS_REQUIRED_FIELDS.filter((field) => !headers.includes(field));
  if (missingHeaders.length > 0) {
    throw new AnalyzeInputError(
      `Formato CSV incorrecto: faltan columnas obligatorias: ${missingHeaders.join(", ")}.`,
      422,
    );
  }

  const satisfactionField = detectSatisfactionField(headers);
  const validRows: Record<string, string>[] = [];
  const invalidRows: InvalidIncidentRow[] = [];
  const invalidByType: Record<string, number> = {};

  rows.forEach((row, index) => {
    const reasons: string[] = [];

    INCIDENTS_REQUIRED_FIELDS.forEach((field) => {
      if (!(row[field] ?? "").trim()) {
        reasons.push(`campo_faltante:${field}`);
      }
    });

    const category = (row.categoria ?? "").trim();
    const state = (row.estado ?? "").trim();
    const creationDate = (row.fecha_creacion ?? "").trim();
    const resolutionRaw = (row.tiempo_resolucion_horas ?? "").trim();

    if (category && !INCIDENTS_ALLOWED_CATEGORIES.includes(category as (typeof INCIDENTS_ALLOWED_CATEGORIES)[number])) {
      reasons.push("categoria_fuera_de_rango");
    }

    if (state && !INCIDENTS_ALLOWED_STATES.includes(state as (typeof INCIDENTS_ALLOWED_STATES)[number])) {
      reasons.push("estado_fuera_de_rango");
    }

    if (creationDate && !isValidIsoDate(creationDate)) {
      reasons.push("fecha_creacion_invalida");
    }

    if (resolutionRaw) {
      const resolution = parseNumber(resolutionRaw);
      if (resolution === null) {
        reasons.push("tiempo_resolucion_no_numerico");
      } else if (resolution < 0) {
        reasons.push("tiempo_resolucion_fuera_de_rango");
      }
    }

    if (satisfactionField) {
      const satisfactionRaw = (row[satisfactionField] ?? "").trim();
      if (satisfactionRaw) {
        const score = parseNumber(satisfactionRaw);
        if (score === null) {
          reasons.push("satisfaccion_no_numerica");
        } else if (score < 0 || score > 10) {
          reasons.push("satisfaccion_fuera_de_rango");
        }
      }
    }

    if (reasons.length > 0) {
      reasons.forEach((reason) => {
        invalidByType[reason] = (invalidByType[reason] ?? 0) + 1;
      });

      invalidRows.push({
        linea_csv: index + 2,
        incidente_id: row.incidente_id ?? "",
        motivos: reasons,
      });
      return;
    }

    validRows.push(row);
  });

  const categories = validRows.map((row) => (row.categoria ?? "").trim());
  const allStates = validRows.map((row) => (row.estado ?? "").trim());

  const satisfactionValues = validRows
    .filter((row) => (row.estado ?? "").trim() === "cerrado" && Boolean(satisfactionField))
    .map((row) => parseNumber((satisfactionField ? row[satisfactionField] : "") ?? ""))
    .filter((value): value is number => value !== null);

  const resolutionValues = validRows
    .filter((row) => ["cerrado", "resuelto"].includes((row.estado ?? "").trim()))
    .map((row) => parseNumber((row.tiempo_resolucion_horas ?? "").trim()))
    .filter((value): value is number => value !== null);

  const summary: IncidentsSummary = {
    total_procesados: rows.length,
    registros_validos: validRows.length,
    registros_invalidos: invalidRows.length,
    total_por_categoria: countBy(categories),
    total_por_estado: {
      abierto: allStates.filter((state) => state === "abierto").length,
      cerrado: allStates.filter((state) => state === "cerrado").length,
      descartado: allStates.filter((state) => state === "descartado").length,
    },
    total_por_estado_completo: countBy(allStates),
    indice_satisfaccion_medio_cerrados:
      satisfactionValues.length > 0
        ? Number(
            (
              satisfactionValues.reduce((acc, current) => acc + current, 0) /
              satisfactionValues.length
            ).toFixed(2),
          )
        : null,
    tiempo_promedio_resolucion_horas:
      resolutionValues.length > 0
        ? Number(
            (
              resolutionValues.reduce((acc, current) => acc + current, 0) /
              resolutionValues.length
            ).toFixed(2),
          )
        : null,
  };

  const differences = compareExpected(summary);

  const result: IncidentsAnalysisResponse = {
    contexto: {
      required_fields: INCIDENTS_REQUIRED_FIELDS,
      allowed_categories: INCIDENTS_ALLOWED_CATEGORIES,
      allowed_states: INCIDENTS_ALLOWED_STATES,
    },
    resumen: summary,
    invalidos: invalidRows,
    invalidos_por_tipo: invalidByType,
    validacion_esperada: {
      coincide: differences.length === 0,
      diferencias: differences,
    },
  };

  const csvExport = buildResultsCsv(summary, invalidByType, differences.length === 0);
  return { result, csvExport };
}
