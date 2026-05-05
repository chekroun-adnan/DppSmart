import { Link } from "react-router-dom";

const footerLinks = [
  { label: "About", href: "/#about" },
  { label: "Capabilities", href: "/#services" },
  { label: "Solutions", href: "/#transformation" },
  { label: "Why Us", href: "/#why-us" },
  { label: "Contact", href: "/#contact" },
];

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-3 group w-fit">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-lg">
                <span className="text-sm font-bold tracking-tighter">IKS</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold tracking-tight text-white">Atelier IKS</div>
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Smart Manufacturing</div>
              </div>
            </Link>
            <p className="mt-5 text-sm leading-relaxed max-w-xs">
              Moroccan leader in children&apos;s garment manufacturing, powered by
              Digital Product Passport technology for full traceability.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Navigation</p>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-5">Location</p>
            <address className="not-italic text-sm leading-relaxed space-y-1">
              <p>Zone Industrielle Sidi Ghanem</p>
              <p>Marrakech, Morocco</p>
            </address>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1.5 ring-1 ring-brand-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-400">DPP System Active</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <p>&copy; {new Date().getFullYear()} Atelier IKS. All rights reserved.</p>
          <p className="text-slate-600">EU DPP Compliant &bull; Secure Enterprise Platform</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
