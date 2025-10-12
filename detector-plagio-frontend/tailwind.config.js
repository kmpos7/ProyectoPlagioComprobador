/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        destructive: "#ef4444", // rojo
        warning: "#f59e0b", // naranja
        success: "#10b981", // verde
        muted: "#f3f4f6",
        background: "#ffffff",
        card: "#ffffff",
        accent: "#e5e7eb",
        primary: "#2563eb", // azul principal
      },
    },
  },
  plugins: [],
};
