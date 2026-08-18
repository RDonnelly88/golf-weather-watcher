// Tailwind 4 ships its own PostCSS plugin and handles vendor prefixing
// internally — no `tailwindcss` entry, no autoprefixer.
export default { plugins: { "@tailwindcss/postcss": {} } };
