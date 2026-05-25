import Markdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { JupyterLine } from "#/utils/parse-cell-content";
import { paragraph } from "../markdown/paragraph";

interface JupyterCellOutputProps {
  lines: JupyterLine[];
}

function downloadImage(url: string, filename: string) {
  const a = document.createElement("a");
  a.download = filename;
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    a.href = url;
    a.click();
  } else {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        a.href = URL.createObjectURL(blob);
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => window.open(url, "_blank"));
  }
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function JupyterCellOutput({ lines }: JupyterCellOutputProps) {
  const { t } = useTranslation();
  return (
    <div className="mx-4 mb-3 rounded-lg overflow-hidden border border-[#2a2a2a]">
      <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <span className="text-[9px] font-mono font-semibold text-[#4b5563] uppercase tracking-widest select-none">
          {t(I18nKey.JUPYTER$OUTPUT_LABEL)}
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] opacity-70" />
      </div>
      <div
        className="overflow-auto max-h-[60vh] bg-[#1e1e1e]"
        style={{ fontSize: "12px" }}
      >
        {lines.map((line, index) => {
          if (line.type === "image") {
            const imageMarkdown = line.url
              ? `![image](${line.url})`
              : line.content;
            return (
              <div key={index} className="p-3 relative group">
                {line.url && (
                  <button
                    type="button"
                    className="absolute top-4 right-4 z-10 flex items-center justify-center w-7 h-7 rounded-md bg-black border border-[#555] text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-[#1a1a1a] hover:border-[#999] shadow-lg"
                    title="Download as PNG"
                    onClick={() =>
                      downloadImage(line.url!, `output_${index + 1}.png`)
                    }
                  >
                    <DownloadIcon />
                  </button>
                )}
                <Markdown
                  components={{ p: paragraph }}
                  urlTransform={(value: string) => value}
                >
                  {imageMarkdown}
                </Markdown>
              </div>
            );
          }
          return (
            <pre
              key={index}
              className="px-4 py-0.5 text-[#d4d4d4] font-mono whitespace-pre-wrap break-words"
              style={{ fontSize: "12px", lineHeight: "1.6" }}
            >
              {line.content}
            </pre>
          );
        })}
      </div>
    </div>
  );
}
