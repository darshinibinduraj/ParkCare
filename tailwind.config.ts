import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg)",
        card: "var(--bg-elevated)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        primary: "var(--primary)",
        "on-primary": "var(--primary-fg)",
        accent: "var(--accent)",
        line: "var(--border)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        ai: "var(--ai)",
        chip: "var(--chip)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', "sans-serif"],
      },
      fontSize: {
        body: ["1rem", { lineHeight: "1.6" }],
        lead: ["1.25rem", { lineHeight: "1.6" }],
      },
      maxWidth: {
        measure: "65ch",
      },
      outlineWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};

export default config;
