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
        saga: {
          navy: "#1A2332",
          orange: "#F39200",
          orangeDark: "#C2410C",
          orangeAmber: "#B45309",
          bg: "#F4F6F9",
          inputBg: "#F1F3F6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
