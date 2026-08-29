/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Uber tarzı siyah-ağırlıklı marka paleti — "primary" adı korunuyor ki
        // mevcut tüm primary-* kullanımları tek yerden güncellensin.
        primary: {
          50: "#f6f6f7",
          100: "#e9e9eb",
          200: "#d3d3d7",
          300: "#a8a8b0",
          400: "#6b6b74",
          500: "#18181b",
          600: "#000000",
          700: "#000000",
          800: "#000000",
          900: "#000000",
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0,0,0,0.08)",
        card: "0 2px 12px -2px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};
