import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

function toRgbChannel(value: string): string {
  const hex = value.replace("#", "");
  const numericValue = Number.parseInt(hex, 16);

  return [
    (numericValue >> 16) & 255,
    (numericValue >> 8) & 255,
    numericValue & 255
  ].join(" ");
}

const linearHypermailTokens: Record<string, string> = {
  "--hm-bg": toRgbChannel("#050614"),
  "--hm-panel": toRgbChannel("#0b0d1a"),
  "--hm-panel-strong": toRgbChannel("#101322"),
  "--hm-surface": toRgbChannel("#171a2b"),
  "--hm-surface-muted": toRgbChannel("#202438"),
  "--hm-border": toRgbChannel("#ffffff"),
  "--hm-foreground": toRgbChannel("#f7f8f8"),
  "--hm-muted": toRgbChannel("#b4bcd0"),
  "--hm-accent": toRgbChannel("#673fd7"),
  "--hm-accent-soft": toRgbChannel("#455eb5"),
  "--hm-positive": toRgbChannel("#4dab76"),
  "--hm-warning": toRgbChannel("#e6a94c"),
  "--hm-danger": toRgbChannel("#ef5d5d"),
  "--hm-info": toRgbChannel("#63b3ed"),
  "--hm-vip": toRgbChannel("#e76bb0"),
  "--hm-ai": toRgbChannel("#8462f4")
};

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
        info: "rgb(var(--hm-info) / <alpha-value>)",
        vip: "rgb(var(--hm-vip) / <alpha-value>)",
        ai: "rgb(var(--hm-ai) / <alpha-value>)"
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
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": linearHypermailTokens
      });
    })
  ]
};

export default config;
