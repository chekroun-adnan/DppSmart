import { useState } from "react";
import { submitContact } from "../services/authService";

function ContactSection() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      await submitContact(form);
      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (e) {
      setError(e.message || "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" aria-label="Contact" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Contact</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Let&apos;s build traceable textile operations
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <article className="rounded-3xl bg-slate-950 p-8 text-white shadow-soft-xl">
            <p className="text-sm font-medium text-slate-400 leading-relaxed">
              Atelier IKS continues to modernize children&apos;s garment production
              through smart traceability and digital excellence.
            </p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-none h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Company</p>
                  <p className="mt-1 text-sm font-semibold text-white">Atelier IKS</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-none h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Location</p>
                  <p className="mt-1 text-sm font-semibold text-white">Zone Industrielle Sidi Ghanem, Marrakech, Morocco</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-none h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Director</p>
                  <p className="mt-1 text-sm font-semibold text-white">Ahmed Kabbadj</p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  DPP System: Online
                </span>
              </div>
            </div>
          </article>

          <form
            className="rounded-3xl bg-white p-8 shadow-soft-xl ring-1 ring-slate-900/8"
            onSubmit={handleSubmit}
          >
            <h3 className="text-xl font-bold text-slate-900 mb-6">Send a message</h3>

            {success ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                <p className="text-sm font-bold text-emerald-800">Message sent successfully!</p>
                <p className="mt-1 text-xs text-emerald-700">We&apos;ll get back to you shortly.</p>
                <button type="button" onClick={() => setSuccess(false)} className="mt-4 text-xs font-bold text-brand-600 hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <div className="grid gap-5">
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Name</span>
                  <input
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    placeholder="Your name"
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Email</span>
                  <input
                    type="email"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    placeholder="you@company.com"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Message</span>
                  <textarea
                    className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 resize-none"
                    placeholder="Tell us about your production or traceability needs."
                    required
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  />
                </label>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary w-full py-3.5 shadow-lg shadow-brand-500/20 disabled:opacity-70"
                >
                  {sending ? "Sending..." : "Send Message"}
                  {!sending && (
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}

export default ContactSection;
