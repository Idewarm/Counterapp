"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const MAX_MB = 5;

export function LogoDropzone({ file, onFile, className }: { file: File | null; onFile: (file: File | null, error?: string) => void; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function accept(f: File | undefined) {
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return onFile(null, "Please choose a PNG, JPG, WEBP or GIF image.");
    if (f.size > MAX_MB * 1024 * 1024) return onFile(null, `Images must be ${MAX_MB} MB or smaller.`);
    onFile(f);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        accept(e.dataTransfer.files[0]);
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        dragging && "border-primary bg-primary/10",
        className,
      )}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
        <img src={preview} alt="Logo preview" className="max-h-40 max-w-full rounded-md object-contain" />
      ) : (
        <ImageUp className="size-10 text-muted-foreground" />
      )}
      <div className="space-y-1">
        <p className="font-medium">{file ? file.name : "Drop your logo here, or click to browse"}</p>
        <p className="text-sm text-muted-foreground">PNG, JPG, WEBP or GIF · up to {MAX_MB} MB</p>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
    </button>
  );
}
