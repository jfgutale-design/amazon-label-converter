
# Amazon Label Converter

Amazon Label Converter is a small Next.js app foundation for converting Amazon Seller Central PDF label sheets into thermal-printer-ready labels.

This MVP includes a PDF upload form, label type selection, PDF-only validation, PDF page-count extraction, per-page PDF splitting, and ZIP download generation. The real Amazon label slicing engine is intentionally not included yet.

## Requirements

- Node.js 18.18 or newer
- npm

## Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the app:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev
npm run build
npm run start
```

## API

`POST /api/convert`

Accepts multipart form data with:

- `file`: PDF file only
- `labelType`: `shipping-4x6` or `fnsku-2x1`

The API reads the uploaded PDF with `pdf-lib`, counts the pages, splits the PDF into one PDF file per source page, and returns an `application/zip` response generated with `jszip`.

For each source PDF page, the ZIP contains one PDF file:

```text
page-1.pdf
page-2.pdf
page-3.pdf
```

Example error response for invalid input:

```json
{
  "message": "Only PDF files are accepted."
}
```

