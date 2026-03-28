/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,191,.2), 0 18px 45px rgba(0,0,0,.45)",
      },
      backgroundImage: {
        "radial-grid":
          "radial-gradient(circle at 20% 20%, rgba(45,212,191,.14), transparent 34%), radial-gradient(circle at 80% 0%, rgba(251,146,60,.12), transparent 30%)",
      },
    },
  },
  plugins: [],
};
