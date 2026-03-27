import { useEffect, useRef } from "react";
import "@js-preview/excel/lib/index.css";
import * as XLSX from "xlsx";

interface Props {
  fileUrl: string;
  className?: string;
}

const ExcelPreview = ({ fileUrl, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<any>(null);

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;

    const run = async () => {
      if (!containerRef.current) return;
      const { default: jsPreviewExcel } = await import("@js-preview/excel");
      if (cancelled) return;

      //兼容XLS文件转换
      let loadUrl = fileUrl;
      if (/\.xls(\?.*)?$/i.test(fileUrl)) {
        const res = await fetch(fileUrl);
        const wb = XLSX.read(await res.arrayBuffer(), { type: "array" });
        blobUrl = URL.createObjectURL(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]));
        loadUrl = blobUrl;
      }

      previewerRef.current = jsPreviewExcel.init(containerRef.current);
      await previewerRef.current.preview(loadUrl);
    };

    run();

    return () => {
      cancelled = true;
      previewerRef.current?.destroy?.();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [fileUrl]);

  return <div ref={containerRef} className={className} />;
};

export default ExcelPreview;