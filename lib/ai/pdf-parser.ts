export interface ParsedPDFResult {
  text: string;
  pages: Array<{
    number: number;
    text: string;
  }>;
}

export async function extractTextFromPDF(pdfUrl: string): Promise<ParsedPDFResult> {
  // PDF text extraction should be done client-side using pdfjs-dist or react-pdf.
  // This function is intentionally disabled to prevent SSR worker errors.
  throw new Error(
    "PDF text extraction is not supported server-side. Please use a client-side approach (browser) for parsing PDFs."
  );
}

// Helper function to find text position in a page
export function findTextPosition(text: string, searchText: string): { start: number; end: number } | null {
  const index = text.indexOf(searchText);
  if (index === -1) return null;
  
  return {
    start: index,
    end: index + searchText.length
  };
}