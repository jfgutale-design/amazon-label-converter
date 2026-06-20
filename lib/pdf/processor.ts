import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

const validLabelTypes = new Set(["shipping-4x6", "fnsku-2x1"]);

const fnsku27UpTemplate = {
  pageWidth: 595.27,
  pageHeight: 841.68,
  columns: 3,
  rows: 9,
  firstX: 24,
  firstY: 718.16,
  columnPitch: 182.425,
  rowPitch: 83.52,
  labelWidth: 180,
  labelHeight: 83.52,
};

type ProcessPdfLabelInput = {
  file: FormDataEntryValue | null;
  labelType: FormDataEntryValue | null;
};

type CropRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
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

  if (labelType === "fnsku-2x1") {
    await addFnskuLabelsToZip(pdf, zip);
  } else {
    await addFullPagesToZip(pdf, zip);
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

async function addFullPagesToZip(pdf: PDFDocument, zip: JSZip) {
  for (let pageNumber = 1; pageNumber <= pdf.getPageCount(); pageNumber += 1) {
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdf, [pageNumber - 1]);

    singlePagePdf.addPage(copiedPage);

    const singlePagePdfBytes = await singlePagePdf.save();

    zip.file(`page-${pageNumber}.pdf`, singlePagePdfBytes);
  }
}

async function addFnskuLabelsToZip(pdf: PDFDocument, zip: JSZip) {
  let labelNumber = 1;

  for (let pageIndex = 0; pageIndex < pdf.getPageCount(); pageIndex += 1) {
    const page = pdf.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const cropRegions = getFnsku27UpCropRegions(pageWidth, pageHeight);

    for (const cropRegion of cropRegions) {
      const labelPdf = await PDFDocument.create();
      const [copiedPage] = await labelPdf.copyPages(pdf, [pageIndex]);

      copiedPage.setSize(cropRegion.width, cropRegion.height);
      copiedPage.translateContent(-cropRegion.x, -cropRegion.y);
      labelPdf.addPage(copiedPage);

      const labelPdfBytes = await labelPdf.save();

      zip.file(`label-${labelNumber}.pdf`, labelPdfBytes);
      labelNumber += 1;
    }
  }
}

function getFnsku27UpCropRegions(pageWidth: number, pageHeight: number) {
  const xScale = pageWidth / fnsku27UpTemplate.pageWidth;
  const yScale = pageHeight / fnsku27UpTemplate.pageHeight;
  const cropRegions: CropRegion[] = [];

  for (let row = 0; row < fnsku27UpTemplate.rows; row += 1) {
    for (let column = 0; column < fnsku27UpTemplate.columns; column += 1) {
      cropRegions.push({
        x: (fnsku27UpTemplate.firstX + column * fnsku27UpTemplate.columnPitch) * xScale,
        y: (fnsku27UpTemplate.firstY - row * fnsku27UpTemplate.rowPitch) * yScale,
        width: fnsku27UpTemplate.labelWidth * xScale,
        height: fnsku27UpTemplate.labelHeight * yScale,
      });
    }
  }

  return cropRegions;
}
