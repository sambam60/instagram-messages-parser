import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': 'var(--background)',
        'foreground': 'var(--foreground)',
        'surface': 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        'surface-active': 'var(--surface-active)',
        'border': 'var(--border)',
        'muted': 'var(--muted)',
        'accent': 'var(--accent)',
        'accent-light': 'var(--accent-light)',
        'sent-bg': 'var(--sent-bg)',
        'sent-text': 'var(--sent-text)',
        'received-bg': 'var(--received-bg)',
        'received-text': 'var(--received-text)',
        'input-bg': 'var(--input-bg)',
      },
    },
  },
  plugins: [],
}
export default config
