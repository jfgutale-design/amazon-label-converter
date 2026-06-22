"use client";

import { FormEvent, useState } from "react";

const labelTypes = [
  {
    value: "fnsku-2x1",
    title: "Product labels",
    size: '2" × 1"',
    description: "Small barcode labels to stick on each product.",
    subtext: "Use this for FNSKU labels.",
  },
  {
    value: "shipping-4x6",
    title: "Shipping labels",
    size: '4" × 6"',
    description: "Large labels to stick on cartons or boxes.",
    subtext: "Use this for Amazon shipment labels.",
  },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [labelType, setLabelType] = useState(labelTypes[0].value);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(nextFile: File | null) {
    setMessage("");
    setIsError(false);

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!isPdf(nextFile)) {
      setFile(null);
      setIsError(true);
      setMessage("Please upload a PDF file.");
      return;
    }

    setFile(nextFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!file) {
      setIsError(true);
      setMessage("Please choose a PDF before converting.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("labelType", labelType);

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Unable to convert PDF.");
      }

      const blob = await response.blob();
      const pageCount = response.headers.get("X-Page-Count");
      const fileName = getDownloadFileName(response);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setMessage(
        pageCount
          ? `File downloaded successfully. Pages processed: ${pageCount}.`
          : "File downloaded successfully.",
      );
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to convert PDF.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="header">
          <h1>Amazon Label Converter</h1>
          <p>
            Upload an Amazon Seller Central PDF label sheet and choose the
            thermal label format you want to prepare.
          </p>
        </header>

        <form className="converter" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pdf-file">PDF label sheet</label>
            <div className="uploadBox">
              <div>
                <input
                  id="pdf-file"
                  name="file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    handleFileChange(event.currentTarget.files?.[0] ?? null)
                  }
                />
                <p className="uploadHint">
                  {file ? file.name : "Only PDF files are accepted."}
                </p>
              </div>
            </div>
          </div>

          <div className="labelPicker" aria-labelledby="label-picker-title">
            <h2 id="label-picker-title">What are you trying to print today?</h2>
            <div className="labelCards">
              {labelTypes.map((type) => {
                const isSelected = labelType === type.value;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`labelCard ${isSelected ? "labelCardActive" : ""}`}
                    key={type.value}
                    onClick={() => setLabelType(type.value)}
                    type="button"
                  >
                    <span className="labelCardTitle">{type.title}</span>
                    <span className="labelCardSize">{type.size}</span>
                    <span className="labelCardDescription">
                      {type.description}
                    </span>
                    <span className="labelCardSubtext">{type.subtext}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Converting..." : "Convert"}
          </button>

          {message ? (
            <p
              className={`message ${
                isError ? "messageError" : "messageSuccess"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getDownloadFileName(response: Response) {
  const contentDisposition = response.headers.get("Content-Disposition");
  const match = contentDisposition?.match(/filename="([^"]+)"/);

  return match?.[1] ?? "amazon-label-converter-output.zip";
}
