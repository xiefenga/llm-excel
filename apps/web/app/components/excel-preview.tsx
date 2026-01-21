import { useEffect, useRef } from "react";
import jsPreviewExcel from "@js-preview/excel";
import '@js-preview/excel/lib/index.css';


interface Props {
  fileUrl: string;
  className?: string;
}

const ExcelPreview = ({ fileUrl, className }: Props) => {

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const previewer = jsPreviewExcel.init(containerRef.current);
      previewer.preview(fileUrl)
      return () => {
        previewer.destroy();
      }
    }
  }, [fileUrl]);

  return (
    <div ref={containerRef} className={className} />
  )
}

export default ExcelPreview