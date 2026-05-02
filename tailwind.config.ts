import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--hm-bg) / <alpha-value>)",
        panel: "rgb(var(--hm-panel) / <alpha-value>)",
        "panel-strong": "rgb(var(--hm-panel-strong) / <alpha-value>)",
        surface: "rgb(var(--hm-surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--hm-surface-muted) / <alpha-value>)",
        border: "rgb(var(--hm-border) / <alpha-value>)",
        foreground: "rgb(var(--hm-foreground) / <alpha-value>)",
        muted: "rgb(var(--hm-muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--hm-accent) / <alpha-value>)",
          soft: "rgb(var(--hm-accent-soft) / <alpha-value>)"
        },
        positive: "rgb(var(--hm-positive) / <alpha-value>)",
        warning: "rgb(var(--hm-warning) / <alpha-value>)",
        danger: "rgb(var(--hm-danger) / <alpha-value>)",
        info: "rgb(var(--hm-info) / <alpha-value>)"
      },
      boxShadow: {
        shell: "var(--hm-shadow-shell)",
        focus: "var(--hm-shadow-focus)"
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "sans-serif"]
      },
      transitionTimingFunction: {
        hyper: "cubic-bezier(0.2, 0.9, 0.2, 1)"
      }
    }
  },
  plugins: []
};

export default config;
