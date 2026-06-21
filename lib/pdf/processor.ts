import { PDFDocument, rgb } from "pdf-lib";
import JSZip from "jszip";

const validLabelTypes = new Set(["shipping-4x6", "fnsku-2x1"]);

const fnsku27UpTemplate = {
  columns: 3,
  rows: 9,
  labelWidthMm: 63.5,
  labelHeightMm: 29.6,
  columnPitchMm: 66,
  rowPitchMm: 29.6,
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

      copiedPage.translateContent(-cropRegion.x, -cropRegion.y);
      copiedPage.setMediaBox(0, 0, cropRegion.width, cropRegion.height);
      copiedPage.setCropBox(0, 0, cropRegion.width, cropRegion.height);
      copiedPage.setBleedBox(0, 0, cropRegion.width, cropRegion.height);
      copiedPage.setTrimBox(0, 0, cropRegion.width, cropRegion.height);
      copiedPage.setArtBox(0, 0, cropRegion.width, cropRegion.height);
      labelPdf.addPage(copiedPage);

      const labelPdfBytes = await labelPdf.save();

      zip.file(`label-${labelNumber}.pdf`, labelPdfBytes);
      labelNumber += 1;
    }

    if (pageIndex === 0) {
      await addFnskuDebugFilesToZip(pdf, zip, cropRegions);
    }
  }
}

async function addFnskuDebugFilesToZip(
  pdf: PDFDocument,
  zip: JSZip,
  cropRegions: CropRegion[],
) {
  zip.file("debug-full-page.pdf", await createFullPageDebugPdf(pdf));
  zip.file(
    "debug-all-crop-boxes.pdf",
    await createCropBoxesDebugPdf(pdf, cropRegions),
  );
  zip.file(
    "debug-label-1-crop-box.pdf",
    await createCropBoxesDebugPdf(pdf, [cropRegions[0]]),
  );
  zip.file(
    "debug-label-14-crop-box.pdf",
    await createCropBoxesDebugPdf(pdf, [cropRegions[13]]),
  );
  zip.file(
    "debug-label-27-crop-box.pdf",
    await createCropBoxesDebugPdf(pdf, [cropRegions[26]]),
  );
}

async function createFullPageDebugPdf(pdf: PDFDocument) {
  const debugPdf = await PDFDocument.create();
  const [copiedPage] = await debugPdf.copyPages(pdf, [0]);

  debugPdf.addPage(copiedPage);

  return debugPdf.save();
}

async function createCropBoxesDebugPdf(
  pdf: PDFDocument,
  cropRegions: CropRegion[],
) {
  const debugPdf = await PDFDocument.create();
  const [copiedPage] = await debugPdf.copyPages(pdf, [0]);

  for (const cropRegion of cropRegions) {
    copiedPage.drawRectangle({
      x: cropRegion.x,
      y: cropRegion.y,
      width: cropRegion.width,
      height: cropRegion.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 2,
    });
  }

  debugPdf.addPage(copiedPage);

  return debugPdf.save();
}

function getFnsku27UpCropRegions(pageWidth: number, pageHeight: number) {
  const labelWidth = mmToPt(fnsku27UpTemplate.labelWidthMm);
  const labelHeight = mmToPt(fnsku27UpTemplate.labelHeightMm);
  const columnPitch = mmToPt(fnsku27UpTemplate.columnPitchMm);
  const rowPitch = mmToPt(fnsku27UpTemplate.rowPitchMm);
  const gridWidth =
    labelWidth + columnPitch * (fnsku27UpTemplate.columns - 1);
  const gridHeight =
    labelHeight + rowPitch * (fnsku27UpTemplate.rows - 1);
  const leftMargin = (pageWidth - gridWidth) / 2;
  const topMargin = (pageHeight - gridHeight) / 2;
  const cropRegions: CropRegion[] = [];

  for (let row = 0; row < fnsku27UpTemplate.rows; row += 1) {
    for (let column = 0; column < fnsku27UpTemplate.columns; column += 1) {
      cropRegions.push({
        x: leftMargin + column * columnPitch,
        y: pageHeight - topMargin - labelHeight - row * rowPitch,
        width: labelWidth,
        height: labelHeight,
      });
    }
  }

  return cropRegions;
}

function mmToPt(mm: number) {
  return (mm / 25.4) * 72;
}
