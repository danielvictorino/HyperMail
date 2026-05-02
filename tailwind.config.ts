import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import {
  amberDark,
  cyanDark,
  grassDark,
  pinkDark,
  redDark,
  slateDark,
  tealDark,
  violetDark
} from "@radix-ui/colors";

function toRgbChannel(value: string): string {
  const hex = value.replace("#", "");
  const numericValue = Number.parseInt(hex, 16);

  return [
    (numericValue >> 16) & 255,
    (numericValue >> 8) & 255,
    numericValue & 255
  ].join(" ");
}

const radixHypermailTokens: Record<string, string> = {
  "--hm-bg": toRgbChannel(slateDark.slate1),
  "--hm-panel": toRgbChannel(slateDark.slate2),
  "--hm-panel-strong": toRgbChannel(slateDark.slate3),
  "--hm-surface": toRgbChannel(slateDark.slate4),
  "--hm-surface-muted": toRgbChannel(slateDark.slate5),
  "--hm-border": toRgbChannel(slateDark.slate7),
  "--hm-foreground": toRgbChannel(slateDark.slate12),
  "--hm-muted": toRgbChannel(slateDark.slate11),
  "--hm-accent": toRgbChannel(tealDark.teal9),
  "--hm-accent-soft": toRgbChannel(tealDark.teal5),
  "--hm-positive": toRgbChannel(grassDark.grass9),
  "--hm-warning": toRgbChannel(amberDark.amber9),
  "--hm-danger": toRgbChannel(redDark.red9),
  "--hm-info": toRgbChannel(cyanDark.cyan9),
  "--hm-vip": toRgbChannel(pinkDark.pink9),
  "--hm-ai": toRgbChannel(violetDark.violet9)
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
        ":root": radixHypermailTokens
      });
    })
  ]
};

export default config;
