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
  "--hm-bg": toRgbChannel("#181921"),
  "--hm-panel": toRgbChannel("#191a23"),
  "--hm-panel-strong": toRgbChannel("#1d1e2b"),
  "--hm-surface": toRgbChannel("#21232e"),
  "--hm-surface-muted": toRgbChannel("#292a35"),
  "--hm-border": toRgbChannel("#ffffff"),
  "--hm-foreground": toRgbChannel("#eeeffc"),
  "--hm-muted": toRgbChannel("#858699"),
  "--hm-accent": toRgbChannel("#575bc7"),
  "--hm-accent-soft": toRgbChannel("#7c7ca4"),
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
