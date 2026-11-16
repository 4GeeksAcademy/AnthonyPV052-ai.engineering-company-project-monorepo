import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
  total_por_estado: Record<string, number>;
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
  invalidos_por_tipo: Record<string, number>;
  invalidos: InvalidIncidentRow[];
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

export class AnalyzeServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzeServiceError";
  }
}

function getRepoRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

function isCsvFilename(name: string): boolean {
  return name.toLowerCase().endsWith(".csv");
}

export async function analyzeIncidentsCsvWithScript(
  csvText: string,
  sourceFilename: string,
): Promise<{ result: IncidentsAnalysisResponse; csvExport: string }> {
  if (!isCsvFilename(sourceFilename)) {
    throw new AnalyzeInputError("Formato incorrecto: el fichero debe tener extensión .csv.", 422);
  }

  if (!csvText.trim()) {
    throw new AnalyzeInputError("El fichero CSV está vacío.", 400);
  }

  const repoRoot = getRepoRoot();
  const scriptPath = path.join(repoRoot, "scripts", "analyze.py");
  const contextPath = path.join(repoRoot, "data", "process", "incidencias_contexto.json");
  const expectedPath = path.join(repoRoot, "data", "eval", "incidencias_expected.json");

  let tmpDir: string;
  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "incidents-analysis-"));
  } catch {
    throw new AnalyzeServiceError("No se pudo preparar el análisis.");
  }
  const inputPath = path.join(tmpDir, "input.csv");
  const outputJsonPath = path.join(tmpDir, "analysis.json");
  const outputCsvPath = path.join(tmpDir, "results.csv");

  try {
    await fs.writeFile(inputPath, csvText, "utf-8");
  } catch {
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw new AnalyzeServiceError("No se pudo preparar el archivo para su análisis.");
  }

  const args = [
    scriptPath,
    inputPath,
    "--context",
    contextPath,
    "--expected",
    expectedPath,
    "--json-output",
    outputJsonPath,
    "--export-csv-path",
    outputCsvPath,
    "--no-prompt",
  ];

  try {
    await execFileAsync("python3", args, {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024 * 10,
    });
  } catch (error) {
    // El script puede salir con código 2 cuando expected no coincide.
    // En ese caso también consumimos los artefactos generados.
    const exitCode = error && typeof error === "object" && "code" in error ? error.code : null;
    if (exitCode !== 2) {
      await fs.rm(tmpDir, { recursive: true, force: true });
      throw new AnalyzeServiceError("El análisis no pudo completarse. Inténtalo de nuevo más tarde.");
    }
  }

  try {
    const [analysisRaw, csvExport] = await Promise.all([
      fs.readFile(outputJsonPath, "utf-8"),
      fs.readFile(outputCsvPath, "utf-8"),
    ]);

    const result = JSON.parse(analysisRaw) as IncidentsAnalysisResponse;

    if (!result?.resumen) {
      throw new AnalyzeInputError("Formato CSV incorrecto o análisis inválido.", 422);
    }

    return { result, csvExport };
  } catch (error) {
    if (error instanceof AnalyzeInputError) throw error;
    throw new AnalyzeServiceError("No se pudieron leer los resultados del análisis.");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}
