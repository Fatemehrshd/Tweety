import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // minimal palette — tweet blue as primary
        brand: {
          50: "#eff6ff",
          500: "#1d9bf0",
          600: "#1a8cd8",
          700: "#1666a8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
