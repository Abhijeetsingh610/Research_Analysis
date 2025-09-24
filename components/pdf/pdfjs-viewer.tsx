"use client";

import React, { useEffect, useRef, useState } from "react";
import type { HighlightLocation } from "@/lib/types";

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export function PDFJSViewer({ url, highlight, onUserSelect, userHighlights = [] }: {
  url: string;
  highlight?: HighlightLocation | null;
  onUserSelect?: (info: { text: string; page: number; rect: DOMRect }) => void;
  userHighlights?: HighlightLocation[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [showTextLayer, setShowTextLayer] = useState(false);

  // Scroll to highlighted page when highlight changes
  useEffect(() => {
    if (highlight && pageRefs.current[highlight.page - 1]) {
      pageRefs.current[highlight.page - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlight]);

  useEffect(() => {
    if (!pdfLoaded || !containerRef.current) return;

    const renderPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!containerRef.current || !window.pdfjsLib) return;
        containerRef.current.innerHTML = "";
        const pdf = await window.pdfjsLib.getDocument(url).promise;
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.2 });

          // Render canvas
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 0 auto";
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
          canvas.style.borderRadius = "4px";
          const context = canvas.getContext("2d");
          if (context) {
            await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
            // Render user highlights (blue)
            userHighlights.filter(h => h.page === pageNum).forEach(h => {
              context.save();
              context.globalAlpha = 0.4;
              context.fillStyle = "#4f8cff";
              if (h.boundingRect) {
                context.fillRect(0, h.boundingRect.y1, viewport.width, h.boundingRect.height);
              } else {
                const bandHeight = viewport.height * 0.12;
                const y = viewport.height * 0.44;
                context.fillRect(0, y, viewport.width, bandHeight);
              }
              context.restore();
            });
            // Highlight chunk if this is the highlighted page (yellow)
            if (highlight && highlight.page === pageNum) {
              context.save();
              context.globalAlpha = 0.4;
              context.fillStyle = "#ffe066";
              if (highlight.boundingRect) {
                context.fillRect(0, highlight.boundingRect.y1, viewport.width, highlight.boundingRect.height);
              } else {
                const bandHeight = viewport.height * 0.12;
                const y = viewport.height * 0.44;
                context.fillRect(0, y, viewport.width, bandHeight);
              }
              context.restore();
            }
          }

          // Render text layer only if showTextLayer is true
          let textLayerDiv: HTMLDivElement | null = null;
          if (showTextLayer) {
            textLayerDiv = document.createElement("div");
            textLayerDiv.style.position = "absolute";
            textLayerDiv.style.left = "0";
            textLayerDiv.style.top = "0";
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.height = `${viewport.height}px`;
            textLayerDiv.style.pointerEvents = "auto";
            textLayerDiv.style.userSelect = "text";
            textLayerDiv.style.zIndex = "10";

            // Get text content
            const textContent = await page.getTextContent();
            textContent.items.forEach((item: any) => {
              if (!item.transform) return;
              const span = document.createElement("span");
              span.textContent = item.str;
              const [a, b, c, d, e, f] = item.transform;
              span.style.position = "absolute";
              span.style.left = `${e}px`;
              span.style.top = `${f - d}px`;
              span.style.fontSize = `${d}px`;
              span.style.fontFamily = "sans-serif";
              span.style.whiteSpace = "pre";
              span.style.background = "transparent";
              if (textLayerDiv) {
                textLayerDiv.appendChild(span);
              }
            });

            // Selection event
            textLayerDiv.onmouseup = (e) => {
              const selection = window.getSelection();
              if (selection && selection.toString().length > 0) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                if (onUserSelect) {
                  onUserSelect({ text: selection.toString(), page: pageNum, rect });
                }
                setShowTextLayer(false);
              }
            };
          }

          // Wrap canvas and text layer in a positioned div
          const pageDiv = document.createElement("div");
          pageDiv.style.position = "relative";
          pageDiv.style.width = `${viewport.width}px`;
          pageDiv.style.height = `${viewport.height}px`;
          pageDiv.appendChild(canvas);
          if (textLayerDiv) pageDiv.appendChild(textLayerDiv);
          pageRefs.current[pageNum - 1] = pageDiv;
          containerRef.current!.appendChild(pageDiv);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to render PDF");
        setLoading(false);
      }
    };
    renderPDF();
  }, [url, pdfLoaded, highlight, onUserSelect, userHighlights, showTextLayer]);

  // Expose a method to enable text layer for selection
  useEffect(() => {
    if (onUserSelect) {
      setShowTextLayer(true);
    }
  }, [onUserSelect]);

  useEffect(() => {
    if (!window.pdfjsLib && !(window as any).pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib || (window as any).pdfjs;
        if (pdfjs) {
          window.pdfjsLib = pdfjs;
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
          setPdfLoaded(true);
        } else {
          setError("PDF.js library loaded but not properly initialized");
          setLoading(false);
        }
      };
      script.onerror = (e) => {
        setError("Failed to load PDF.js library from CDN");
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      setPdfLoaded(true);
    }
  }, []);

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
