import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

const validLabelTypes = new Set(["shipping-4x6", "fnsku-2x1"]);

type ProcessPdfLabelInput = {
  file: FormDataEntryValue | null;
  labelType: FormDataEntryValue | null;
};

export async function processPdfLabel({
  file,
  labelType,
}: ProcessPdfLabelInput) {
  if (!(file instanceof File)) {
    throw new Error("Please upload a PDF file.");
  }

  if (!isPdf(file)) {
    throw new Error("Only PDF files are accepted.");
  }

  if (typeof labelType !== "string" || !validLabelTypes.has(labelType)) {
    throw new Error("Please choose a valid label type.");
  }

  const pdfBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(pdfBytes);
  const pageCount = pdf.getPageCount();
  const zip = new JSZip();

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdf, [pageNumber - 1]);

    singlePagePdf.addPage(copiedPage);

    const singlePagePdfBytes = await singlePagePdf.save();

    zip.file(`page-${pageNumber}.pdf`, singlePagePdfBytes);
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return {
    fileName: "amazon-label-converter-output.zip",
    pageCount,
    zipBuffer,
  };
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
