import { NextResponse } from "next/server";
import {
  AnalyzeInputError,
  analyzeIncidentsCsvWithScript,
} from "@/services/api/incidents/analysis-service";
import { saveLastAnalysis } from "@/services/api/incidents/results-store";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          error:
            "Formato de petición incorrecto: usa multipart/form-data con el campo 'file'.",
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar un fichero CSV en el campo 'file'." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "El fichero CSV está vacío." },
        { status: 400 },
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Formato incorrecto: el fichero debe tener extensión .csv." },
        { status: 422 },
      );
    }

    const csvText = await file.text();
    const { result, csvExport } = await analyzeIncidentsCsvWithScript(csvText, file.name);

    saveLastAnalysis({
      filename: file.name,
      csvExport,
      result,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ...result,
      archivo: {
        nombre: file.name,
        tamanio_bytes: file.size,
      },
    });
  } catch (error) {
    if (error instanceof AnalyzeInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error: "Se ha producido un error inesperado al analizar el fichero CSV.",
      },
      { status: 500 },
    );
  }
}
