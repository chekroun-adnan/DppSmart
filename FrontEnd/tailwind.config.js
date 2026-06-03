
module.exports = {
  darkMode: "class",
  content: ["./public/index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0B1120",
          surface: "#111827",
          sidebar: "#0F172A",
          card: "#1E293B",
          border: "rgba(255,255,255,0.08)",
        },
        brand: {
          50: "#f5f7ff",
          100: "#ebf0ff",
          200: "#d6e0ff",
          300: "#b3c7ff",
          400: "#80a1ff",
          500: "#4d7aff",
          600: "#2563EB",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#00154d",
        },
        slate: {
          950: "#020617",
        },
        ink: {
          950: "#0d1117",
        },
        success: {
          DEFAULT: "#22C55E",
          50: "#f0fdf4",
          500: "#22C55E",
          600: "#16a34a",
        },
        warning: {
          DEFAULT: "#F59E0B",
          50: "#fffbeb",
          500: "#F59E0B",
          600: "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "premium": "0 20px 50px -12px rgba(0, 0, 0, 0.15)",
        "premium-hover": "0 30px 60px -12px rgba(0, 0, 0, 0.25)",
        "glass": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)",
        "soft-xl": "0 20px 40px -8px rgba(0, 0, 0, 0.10), 0 8px 16px -4px rgba(0, 0, 0, 0.06)",
        "dark-card": "0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.3)",
        "dark-card-hover": "0 4px 12px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.4)",
        "dark-elevated": "0 8px 24px rgba(0,0,0,0.5), 0 2px 8px -4px rgba(0,0,0,0.5)",
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out forwards",
        "slide-up": "slide-up 0.6s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "shake": "shake 0.5s ease-in-out",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
}
