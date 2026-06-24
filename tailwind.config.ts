import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#C41E3A",
          dark:    "#A01830",
          light:   "#D94055",
        },
        silver: {
          DEFAULT: "#C0C0C0",
          dark:    "#9CA3AF",
        },
        surface: {
          DEFAULT: "#141414",
          900: "#0f0f0f",
          950: "#0a0a0a",
        },
        border: "#252525",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
export default config;
