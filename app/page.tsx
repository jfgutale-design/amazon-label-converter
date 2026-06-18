"use client";

import { FormEvent, useState } from "react";

const labelTypes = [
  { value: "shipping-4x6", label: "Shipping label 4x6" },
  { value: "fnsku-2x1", label: "FNSKU label 2x1" },
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
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to convert PDF.");
      }

      setMessage(data.message ?? "PDF received successfully.");
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

          <div className="field">
            <label htmlFor="label-type">Label type</label>
            <select
              className="select"
              id="label-type"
              name="labelType"
              value={labelType}
              onChange={(event) => setLabelType(event.currentTarget.value)}
            >
              {labelTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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
