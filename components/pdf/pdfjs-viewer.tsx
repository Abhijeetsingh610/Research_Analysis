"use client";

import { useEffect, useRef, useState } from "react";

interface PDFJSViewerProps {
  url: string;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function PDFJSViewer({ url }: PDFJSViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  useEffect(() => {
    // Load PDF.js from CDN if not already loaded
    if (!window.pdfjsLib && !(window as any).pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
      script.onload = () => {
        // PDF.js attaches itself to window.pdfjsLib in newer versions
        const pdfjs = (window as any).pdfjsLib || (window as any).pdfjs;
        if (pdfjs) {
          window.pdfjsLib = pdfjs;
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
          setPdfLoaded(true);
        } else {
          console.error("PDF.js loaded but pdfjsLib not found on window");
          setError("PDF.js library loaded but not properly initialized");
          setLoading(false);
        }
      };
      script.onerror = (e) => {
        console.error("Failed to load PDF.js script:", e);
        setError("Failed to load PDF.js library from CDN");
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      setPdfLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!pdfLoaded || !containerRef.current) return;

    const renderPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!containerRef.current || !window.pdfjsLib) return;
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
              canvas: canvas,
            }).promise;
          }

          containerRef.current!.appendChild(canvas);
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
