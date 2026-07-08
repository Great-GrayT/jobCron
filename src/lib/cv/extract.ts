// Client-side CV text extraction. Nothing is uploaded to the server — PDF and
// Word (.docx) are parsed in the browser. Legacy .doc isn't supported.

/** Extract plain text from an uploaded CV file (PDF or .docx). */
export async function extractCvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdf(file);
  if (name.endsWith(".docx")) return extractDocx(file);
  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc isn't supported — please re-save as PDF or .docx and try again.");
  }
  throw new Error("Unsupported file — upload a PDF or Word (.docx) file.");
}

async function extractDocx(file: File): Promise<string> {
  // webpack resolves mammoth's browser build for the client bundle.
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker is served as a static ES module from /public (copied by
  // scripts/copy-pdf-worker.js) — bundling it breaks Terser on the worker's
  // import.meta. Same-origin, so it satisfies the worker-src CSP.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  await doc.destroy();
  return text;
}
