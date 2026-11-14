import { STATUSES, CATEGORIES, ORIGINS, BRANCHES, statusLabels, categoryLabels, originLabels, branchLabels } from "@/lib/incidents-manager";

type Status = (typeof STATUSES)[number][0];
type Category = (typeof CATEGORIES)[number][0];
type Origin = (typeof ORIGINS)[number][0];
type Branch = (typeof BRANCHES)[number][0];

interface Incident {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: Status;
  origin: Origin;
  branch: Branch;
  created_at: string;
  updated_at: string;
}

interface Summary {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  discarded: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_origin: Record<string, number>;
  by_branch: Record<string, number>;
}

// ─── Funciones helper compartidas entre page.tsx e IncidentsClient.tsx ───

export type IncidentForm = Omit<Incident, "id" | "created_at" | "updated_at">;

export const EMPTY_FORM: IncidentForm = {
  title: "",
  description: "",
  category: "equipment_failure",
  status: "open",
  origin: "branch",
  branch: "central",
};

export const NEXT: Record<Status, Status[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

export function errorFrom(payload: unknown): { field?: string; message: string } {
  if (payload && typeof payload === "object") {
    const result = payload as { error?: { field?: string; message?: string }; detail?: { field?: string; message?: string } };
    const error = result.error ?? result.detail;
    if (error?.message) return { field: error.field, message: error.message };
  }
  return { message: "No pudimos completar la operación. Inténtalo de nuevo." };
}

export async function json(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const BADGE_TONES: Record<Status, string> = {
  open: "bg-amber-300/10 text-amber-100 border-amber-300/40",
  in_progress: "bg-cyan-300/10 text-cyan-100 border-cyan-300/40",
  resolved: "bg-emerald-300/10 text-emerald-100 border-emerald-300/40",
  discarded: "bg-slate-300/10 text-slate-200 border-slate-400/40",
};

export function Badge({ value }: { value: Status }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${BADGE_TONES[value]}`}
    >
      {statusLabels[value]}
    </span>
  );
}

export function summaryGroups(summary: Summary) {
  return [
    ["Por estado", summary.by_status, statusLabels],
    ["Por categoría", summary.by_category, categoryLabels],
    ["Por origen", summary.by_origin, originLabels],
    ["Por sede", summary.by_branch, branchLabels],
    ] as const;
}