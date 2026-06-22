import { PDFDocument } from "pdf-lib";

const validLabelTypes = new Set(["shipping-4x6", "fnsku-2x1"]);

const thermal4x6Page = {
  width: 288,
  height: 432,
};

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

  if (labelType === "fnsku-2x1") {
    return {
      fileBuffer: await createProductLabelsPrintReadyPdf(pdf),
      fileName: "product-labels-print-ready.pdf",
      contentType: "application/pdf",
      pageCount,
    };
  }

  return {
    fileBuffer: await createShippingLabelsPrintReadyPdf(pdf),
    fileName: "shipping-label-print-ready.pdf",
    contentType: "application/pdf",
    pageCount,
  };
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function createShippingLabelsPrintReadyPdf(pdf: PDFDocument) {
  const printReadyPdf = await PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= pdf.getPageCount(); pageNumber += 1) {
    const sourcePage = pdf.getPage(pageNumber - 1);
    const { width: sourceWidth, height: sourceHeight } = sourcePage.getSize();
    const embeddedPage = await printReadyPdf.embedPage(sourcePage);
    const scale = Math.min(
      thermal4x6Page.width / sourceWidth,
      thermal4x6Page.height / sourceHeight,
    );
    const scaledWidth = sourceWidth * scale;
    const scaledHeight = sourceHeight * scale;
    const x = (thermal4x6Page.width - scaledWidth) / 2;
    const y = (thermal4x6Page.height - scaledHeight) / 2;
    const thermalPage = printReadyPdf.addPage([
      thermal4x6Page.width,
      thermal4x6Page.height,
    ]);

    thermalPage.drawPage(embeddedPage, {
      x,
      y,
      width: scaledWidth,
      height: scaledHeight,
    });
  }

  return toArrayBuffer(await printReadyPdf.save());
}

async function createProductLabelsPrintReadyPdf(pdf: PDFDocument) {
  const printReadyPdf = await PDFDocument.create();

  for (let pageIndex = 0; pageIndex < pdf.getPageCount(); pageIndex += 1) {
    const page = pdf.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const cropRegions = getFnsku27UpCropRegions(pageWidth, pageHeight);

    for (const cropRegion of cropRegions) {
      const labelPdf = await createCroppedFnskuLabelPdf(
        pdf,
        pageIndex,
        cropRegion,
      );
      const [labelPage] = await printReadyPdf.copyPages(labelPdf, [0]);

      printReadyPdf.addPage(labelPage);
    }
  }

  return toArrayBuffer(await printReadyPdf.save());
}

async function createCroppedFnskuLabelPdf(
  pdf: PDFDocument,
  pageIndex: number,
  cropRegion: CropRegion,
) {
  const labelPdf = await PDFDocument.create();
  const [copiedPage] = await labelPdf.copyPages(pdf, [pageIndex]);

  copiedPage.translateContent(-cropRegion.x, -cropRegion.y);
  copiedPage.setMediaBox(0, 0, cropRegion.width, cropRegion.height);
  copiedPage.setCropBox(0, 0, cropRegion.width, cropRegion.height);
  copiedPage.setBleedBox(0, 0, cropRegion.width, cropRegion.height);
  copiedPage.setTrimBox(0, 0, cropRegion.width, cropRegion.height);
  copiedPage.setArtBox(0, 0, cropRegion.width, cropRegion.height);
  labelPdf.addPage(copiedPage);

  return labelPdf;
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

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  const view = new Uint8Array(buffer);

  view.set(bytes);

  return buffer;
}
