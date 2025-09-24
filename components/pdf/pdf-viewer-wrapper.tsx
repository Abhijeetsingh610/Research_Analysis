"use client";

import dynamic from "next/dynamic";

// Dynamically import the PDF viewer with all its dependencies
const PDFViewerComponent = dynamic(() => import("@/components/pdf/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading PDF viewer...</p>
      </div>
    </div>
  ),
});

interface PDFViewerProps {
  paperId: string
  pdfUrl: string
  analysis?: any
  notes: any[]
}

export default function PDFViewer(props: PDFViewerProps) {
  return <PDFViewerComponent {...props} />;
}   