import { LoaderCircle, File } from "lucide-react";
import { RemoveFileButton } from "./remove-file-button";
import { cn, getFileExtension } from "#/utils/utils";

interface UploadedFileProps {
  file: File;
  onRemove: () => void;
  isLoading?: boolean;
}

export function UploadedFile({
  file,
  onRemove,
  isLoading = false,
}: UploadedFileProps) {
  const fileExtension = getFileExtension(file.name);

  return (
    <div className="group flex gap-2 rounded-lg bg-[var(--cg-bg-badge)] max-w-[160px] px-3 py-1 relative">
      <div className="flex flex-col justify-center gap-0.25">
        <RemoveFileButton onClick={onRemove} />
        <div className="flex items-center gap-2 w-full">
          <span
            className={cn(
              "text-sm font-normal leading-5 flex-1 max-w-[136px] truncate",
              isLoading ? "max-w-[108px] text-[var(--cg-text-muted)]" : "text-[var(--cg-text-primary)]",
            )}
          >
            {file.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <File size={12} color="#A7A7A7" />
          <span className="text-[9px] font-normal leading-5 text-[#A7A7A7]">
            {fileExtension}
          </span>
        </div>
      </div>
      {isLoading && (
        <div className="flex items-center justify-center">
          <LoaderCircle className="animate-spin w-5 h-5" color="white" />
        </div>
      )}
    </div>
  );
}
