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
        border: "rgb(var(--hm-border) / <alpha-value>)",
        foreground: "rgb(var(--hm-foreground) / <alpha-value>)",
        muted: "rgb(var(--hm-muted) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--hm-accent) / <alpha-value>)",
          soft: "rgb(var(--hm-accent-soft) / <alpha-value>)"
        }
      },
      boxShadow: {
        shell: "0 14px 44px rgba(0, 0, 0, 0.32)",
        focus:
          "0 0 0 1px rgba(162, 126, 255, 0.45), 0 0 0 6px rgba(162, 126, 255, 0.12)"
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
