// Copy pdfjs-dist's worker into /public so it's served as a static ES module and
// loaded by URL at runtime | bundling it (via new URL(import.meta.url)) makes
// webpack/Terser choke on the worker's `import.meta`. Runs before `next build`
// (and can be run manually) so the file always matches the installed pdfjs version.
const fs = require("fs");
const path = require("path");

const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
const src = path.join(pkgDir, "build", "pdf.worker.min.mjs");
const destDir = path.join(process.cwd(), "public");
const dest = path.join(destDir, "pdf.worker.min.mjs");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`copied ${path.basename(src)} -> public/`);
