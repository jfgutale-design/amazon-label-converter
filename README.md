# Amazon Label Converter

Amazon Label Converter is a small Next.js app foundation for converting Amazon Seller Central PDF label sheets into thermal-printer-ready labels.

This MVP foundation includes a PDF upload form, label type selection, PDF-only validation, and a placeholder conversion API. The real PDF slicing engine is intentionally not included yet.

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

Current placeholder response:

```json
{
  "message": "PDF received successfully. Processing engine coming next."
}
```
