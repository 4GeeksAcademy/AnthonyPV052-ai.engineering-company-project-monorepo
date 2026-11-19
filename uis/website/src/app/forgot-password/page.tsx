"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch {
      setError("No pudimos enviar la solicitud. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-950 p-4 text-stone-100 sm:p-8">
      <section className="w-full max-w-lg rounded-3xl border border-orange-300/25 bg-slate-900 p-8 shadow-2xl shadow-orange-950/30 sm:p-10">
        <Link href="/" className="text-sm font-bold uppercase tracking-[0.2em] text-orange-300">Brasaland</Link>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-orange-200">Recuperar acceso</p>
        <h1 className="mt-3 text-3xl font-black text-white">Restablece tu contraseña</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Indica tu email y, si corresponde a una cuenta, recibirás un enlace seguro.</p>

        {submitted ? (
          <div role="status" className="mt-8 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"><p>Si esa dirección está registrada, recibirás un enlace en breve.</p><p className="mt-2">Revisa tu correo y sigue el enlace para continuar.</p></div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-semibold text-slate-200" htmlFor="email">
              Email
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-300/30" />
            </label>
            {error && <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-orange-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-60">{submitting ? "Enviando…" : "Enviar enlace de restablecimiento"}</button>
          </form>
        )}
        <p className="mt-6 text-sm text-slate-300"><Link href="/login" className="font-semibold text-orange-300 underline underline-offset-4 hover:text-orange-200">Volver a iniciar sesión</Link></p>
      </section>
    </main>
  );
}
