"use client";

import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

export default function LogoutButton() {
  const router = useRouter();

  function logout() {
    clearToken();
    router.replace("/auth/login");
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-300 hover:text-orange-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
    >
      Cerrar sesión
    </button>
  );
}
