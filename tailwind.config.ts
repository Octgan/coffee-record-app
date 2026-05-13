import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      keyframes: {
        "tutorial-rise": {
          "0%": { opacity: "0", transform: "translateY(1.125rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "tutorial-rise": "tutorial-rise 0.58s cubic-bezier(0.22, 1, 0.36, 1) forwards"
      }
    }
  },
  plugins: []
};

export default config;
