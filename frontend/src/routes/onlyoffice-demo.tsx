/* eslint-disable i18next/no-literal-string */
import React from "react";
import OnlyOfficeEditor from "#/components/features/office-viewer/OnlyOfficeEditor";

/**
 * Demo page for the ONLYOFFICE editor. Renders OnlyOfficeEditor against a
 * sample file so the integration can be exercised end-to-end.
 *
 * The file URL must be reachable BY THE ONLYOFFICE CONTAINER — on a single host
 * use host.docker.internal (see ONLYOFFICE_SETUP.md). Serve a sample first, e.g.:
 *   python3 -m http.server 8080          # in a folder containing sample.xlsx
 * then set the URL below to http://host.docker.internal:8080/sample.xlsx
 */

interface Sample {
  label: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

const SAMPLES: Sample[] = [
  {
    label: "Spreadsheet (xlsx)",
    fileUrl: "http://host.docker.internal:8080/sample.xlsx",
    fileName: "sample.xlsx",
    fileType: "xlsx",
  },
  {
    label: "Document (docx)",
    fileUrl: "http://host.docker.internal:8080/sample.docx",
    fileName: "sample.docx",
    fileType: "docx",
  },
  {
    label: "PDF (pdf)",
    fileUrl: "http://host.docker.internal:8080/sample.pdf",
    fileName: "sample.pdf",
    fileType: "pdf",
  },
];

const CALLBACK_URL = "http://host.docker.internal:3000/api/onlyoffice/callback";

export default function OnlyOfficeDemo() {
  const [sampleIdx, setSampleIdx] = React.useState(0);
  const [mode, setMode] = React.useState<"edit" | "view">("edit");
  const [url, setUrl] = React.useState(SAMPLES[0].fileUrl);

  const sample = SAMPLES[sampleIdx];

  // Remount the editor when any input that affects the doc changes, so the
  // connector re-requests a token (and thus a fresh, unique document key).
  const editorKey = `${url}|${sample.fileType}|${mode}`;

  return (
    <div className="flex h-full w-full flex-col bg-[var(--cg-bg-page)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--cg-border-subtle)] px-4 py-2 text-[12px]">
        <span className="font-medium text-[var(--cg-text-primary)]">
          ONLYOFFICE demo
        </span>

        <select
          value={sampleIdx}
          onChange={(e) => {
            const idx = Number(e.target.value);
            setSampleIdx(idx);
            setUrl(SAMPLES[idx].fileUrl);
          }}
          className="rounded border border-[var(--cg-border-subtle)] bg-transparent px-2 py-1"
        >
          {SAMPLES.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          spellCheck={false}
          className="min-w-[320px] flex-1 rounded border border-[var(--cg-border-subtle)] bg-transparent px-2 py-1 font-mono text-[11px]"
          placeholder="container-reachable file URL"
        />

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "edit" | "view")}
          className="rounded border border-[var(--cg-border-subtle)] bg-transparent px-2 py-1"
        >
          <option value="edit">edit</option>
          <option value="view">view</option>
        </select>
      </div>

      <div className="min-h-0 flex-1">
        <OnlyOfficeEditor
          key={editorKey}
          fileUrl={url}
          fileName={sample.fileName}
          fileType={sample.fileType}
          mode={mode}
          callbackUrl={CALLBACK_URL}
        />
      </div>
    </div>
  );
}
