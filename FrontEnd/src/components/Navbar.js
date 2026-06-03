import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { label: "About", href: "/#about" },
  { label: "Capabilities", href: "/#services" },
  { label: "Solutions", href: "/#transformation" },
  { label: "Why Us", href: "/#why-us" },
  { label: "Contact", href: "/#contact" },
];

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const hasSession = Boolean(localStorage.getItem("accessToken"));

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/80 backdrop-blur-lg border-b border-slate-200/50 py-3 shadow-sm" : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-lg transition-transform group-hover:scale-105">
            <span className="text-sm font-bold tracking-tighter">IKS</span>
          </div>
          <div className="leading-tight">
            <div className={`text-sm font-bold tracking-tight transition-colors ${isScrolled || location.pathname !== "/" ? "text-slate-900" : "text-white"}`}>
              Atelier IKS
            </div>
            <div className={`text-[10px] uppercase tracking-widest transition-colors ${isScrolled || location.pathname !== "/" ? "text-slate-500" : "text-white/70"}`}>
              Smart Manufacturing
            </div>
          </div>
        </Link>

        
        <nav className="hidden items-center gap-8 text-sm font-medium lg:flex">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`transition-colors hover:text-brand-600 ${
                isScrolled || location.pathname !== "/" ? "text-slate-600" : "text-white/90"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isScrolled || location.pathname !== "/" ? "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/40" : "text-white/80 hover:bg-white/10"
            }`}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <div className="hidden items-center gap-3 sm:flex">
            {hasSession ? (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm font-semibold px-4 py-2 rounded-full transition-all ${
                    isScrolled || location.pathname !== "/" ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings"
                  className={`text-sm font-semibold px-4 py-2 rounded-full transition-all ${
                    isScrolled || location.pathname !== "/" ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
                  }`}
                >
                  Settings
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className={`text-sm font-semibold px-4 py-2 rounded-full transition-all ${
                  isScrolled || location.pathname !== "/" ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
                }`}
              >
                Log in
              </Link>
            )}
            <Link
              to="/register"
              className="btn-primary py-2 px-5 text-sm shadow-md"
            >
              Get Started
            </Link>
          </div>

          
          <button 
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isScrolled || location.pathname !== "/" ? "text-slate-900 hover:bg-slate-100" : "text-white hover:bg-white/10"
            }`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 animate-fade-in shadow-xl">
          <nav className="flex flex-col p-4 gap-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-base font-medium text-slate-700 hover:text-brand-600 px-2 py-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <hr className="border-slate-100" />
            <div className="flex flex-col gap-3">
              {!hasSession && (
                <Link to="/login" className="btn-secondary w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  Log in
                </Link>
              )}
              <Link to="/register" className="btn-primary w-full" onClick={() => setIsMobileMenuOpen(false)}>
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
