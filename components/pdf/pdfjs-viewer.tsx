"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface PDFJSViewerProps {
  url: string;
}

export default function PDFJSViewer({ url }: PDFJSViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  useEffect(() => {
    // Load PDF.js from CDN only once
    if (!window.pdfjsLib && !pdfLoaded) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js";
      script.async = true;

      script.onload = () => {
        // Set worker source
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js";
        setPdfLoaded(true);
      };

      script.onerror = () => {
        setError("Failed to load PDF.js library");
        setLoading(false);
      };

      document.head.appendChild(script);
    } else if (window.pdfjsLib) {
      setPdfLoaded(true);
    }
  }, [pdfLoaded]);

  useEffect(() => {
    if (!pdfLoaded || !containerRef.current) return;

    const renderPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!containerRef.current) return;
        containerRef.current.innerHTML = "";

        console.log("Loading PDF from:", url);
        const pdf = await window.pdfjsLib.getDocument(url).promise;
        console.log("PDF loaded with", pdf.numPages, "pages");

        // Render all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.2 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 20px auto";
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
          canvas.style.borderRadius = "4px";

          const context = canvas.getContext("2d");
          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;
          }

          containerRef.current.appendChild(canvas);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF:", err);
        setError(err instanceof Error ? err.message : "Failed to render PDF");
        setLoading(false);
      }
    };

    renderPDF();
  }, [url, pdfLoaded]);

  return (
    <div className="w-full max-w-4xl mx-auto overflow-y-auto h-screen border rounded-lg p-4 bg-gray-50">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <p className="text-lg">Loading PDF...</p>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-8">
          <p className="text-lg text-red-500">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="flex flex-col items-center" />
    </div>
  );
}
