"use client";

import { FormEvent, useRef, useState } from "react";
import {
  defaultProductLabelTemplateId,
  productLabelTemplates,
} from "@/lib/pdf/product-label-templates";

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

const devOnlySpinnerTestDelayMs = 1500;
const productTemplateMismatchMessage =
  "This PDF does not appear to match the selected product label template.";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [labelType, setLabelType] = useState("");
  const [productTemplateId, setProductTemplateId] = useState<string>(
    defaultProductLabelTemplateId,
  );
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

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
      setMessage("Please upload a valid PDF file.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setFile(nextFile);
  }

  function handleLabelTypeChange(nextLabelType: string) {
    setMessage("");
    setIsError(false);
    setLabelType(nextLabelType);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    setMessage("");
    setIsError(false);

    if (!file) {
      setIsError(true);
      setMessage("Please upload a PDF file first.");
      return;
    }

    if (!labelType) {
      setIsError(true);
      setMessage("Please choose what you are trying to print.");
      return;
    }

    if (!isPdf(file)) {
      setIsError(true);
      setMessage("Please upload a valid PDF file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("labelType", labelType);

    if (labelType === "fnsku-2x1") {
      formData.append("productTemplateId", productTemplateId);
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setMessage("Converting your label PDF...");

    try {
      await waitForDevOnlySpinnerTestDelay();

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };

        if (data.message === productTemplateMismatchMessage) {
          throw new Error(productTemplateMismatchMessage);
        }

        throw new Error("Conversion failed.");
      }

      const blob = await response.blob();
      const fileName = getDownloadFileName(response);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      setMessage("Conversion complete. Your download will start now.");
      await wait(500);

      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setMessage("");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error && error.message === productTemplateMismatchMessage
          ? productTemplateMismatchMessage
          : "Something went wrong while converting your PDF. Please try again.",
      );
    } finally {
      isSubmittingRef.current = false;
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
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    key={type.value}
                    onClick={() => handleLabelTypeChange(type.value)}
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

          {labelType === "fnsku-2x1" ? (
            <div className="field">
              <label htmlFor="product-template">Product label template</label>
              <select
                className="select"
                disabled={isSubmitting}
                id="product-template"
                name="productTemplateId"
                onChange={(event) => {
                  setMessage("");
                  setIsError(false);
                  setProductTemplateId(event.currentTarget.value);
                }}
                value={productTemplateId}
              >
                {productLabelTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="buttonLoading">
                <span aria-hidden="true" className="spinner" />
                Converting your label PDF...
              </span>
            ) : (
              "Convert"
            )}
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

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function waitForDevOnlySpinnerTestDelay() {
  // Temporary dev-only delay for visibly testing the spinner and disabled state.
  if (process.env.NODE_ENV === "development") {
    await wait(devOnlySpinnerTestDelayMs);
  }
}
