import { NextResponse } from "next/server";
import { analyzeIncidentRows, parseCsv, summaryToCsv } from "@/lib/incidents-analyzer";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar un archivo CSV en el campo 'file'." },
        { status: 400 },
      );
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "El CSV no contiene registros analizables." },
        { status: 400 },
      );
    }

    const result = analyzeIncidentRows(rows);
    const summaryCsv = summaryToCsv(result.resumen);

    return NextResponse.json({
      ...result,
      export_csv: summaryCsv,
      archivo: {
        nombre: file.name,
        tamanio_bytes: file.size,
      },
    });
  } catch (error) {
    console.error("Failed to analyze incidents CSV", error);
    const invalidCsv = error instanceof Error && /csv|column|parse|format/i.test(error.message);
    return NextResponse.json(
      {
        error: "No se pudo procesar el archivo. Revisa que sea un CSV válido e inténtalo de nuevo.",
      },
      { status: invalidCsv ? 422 : 500 },
    );
  }
}
