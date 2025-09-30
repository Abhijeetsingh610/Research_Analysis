export interface ParsedPDFResult {
  text: string;
  pages: Array<{
    number: number;
    text: string;
  }>;
}

export interface TextItem {
  text: string;
  page: number;
  pageNumber?: number; // Alias for compatibility
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth?: number;   // Viewport width (for react-pdf-highlighter)
  pageHeight?: number;  // Viewport height (for react-pdf-highlighter)
}

export interface ExtractedTextWithPositions {
  textItems: TextItem[];
  plainText: string;
  pageTexts: Array<{ page: number; text: string }>;
}

/**
 * Sort text items by reading order (handles 2-column layouts common in research papers)
 * 
 * Algorithm:
 * 1. Detect column boundary (typically at page center)
 * 2. Separate items into left/right columns
 * 3. Sort each column top-to-bottom
 * 4. Concatenate: left column first, then right column
 */
function sortTextItemsByReadingOrder(items: TextItem[], pageWidth: number): TextItem[] {
  if (items.length === 0) return [];
  
  // ✅ STEP 1: Detect if page has multiple columns
  // Calculate X-position distribution to find column boundaries
  const xPositions = items.map(item => item.x).sort((a, b) => a - b);
  const median = xPositions[Math.floor(xPositions.length / 2)];
  const pageCenter = pageWidth / 2;
  
  // Detect if this is likely a 2-column layout
  // If most text is far from center, it's probably 2 columns
  const leftItems = items.filter(item => item.x < pageCenter);
  const rightItems = items.filter(item => item.x >= pageCenter);
  
  const isTwoColumn = leftItems.length > 5 && rightItems.length > 5;
  
  console.log(`📊 Column detection: ${isTwoColumn ? 'TWO-COLUMN' : 'SINGLE-COLUMN'} layout (left: ${leftItems.length}, right: ${rightItems.length})`);
  
  if (isTwoColumn) {
    // ✅ TWO-COLUMN LAYOUT: Sort each column separately, then concatenate
    
    // Sort left column top-to-bottom, then left-to-right
    const sortedLeft = leftItems.sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > a.height * 0.5) return yDiff; // Different lines
      return a.x - b.x; // Same line, sort left-to-right
    });
    
    // Sort right column top-to-bottom, then left-to-right
    const sortedRight = rightItems.sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > a.height * 0.5) return yDiff; // Different lines
      return a.x - b.x; // Same line, sort left-to-right
    });
    
    // ✅ Concatenate: Read left column first (top to bottom), then right column
    return [...sortedLeft, ...sortedRight];
  } else {
    // ✅ SINGLE-COLUMN LAYOUT: Sort top-to-bottom, then left-to-right
    return items.sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > a.height * 0.5) return yDiff; // Different lines
      return a.x - b.x; // Same line, sort left-to-right
    });
  }
}

export async function extractTextFromPDF(pdfUrl: string): Promise<ParsedPDFResult> {
  // PDF text extraction should be done client-side using pdfjs-dist or react-pdf.
  // This function is intentionally disabled to prevent SSR worker errors.
  throw new Error(
    "PDF text extraction is not supported server-side. Please use a client-side approach (browser) for parsing PDFs."
  );
}

/**
 * Extract text from PDF with position data (CLIENT-SIDE ONLY)
 * This function captures the coordinates of each text item for accurate highlighting
 */
export async function extractTextWithPositions(
  pdfFile: File
): Promise<ExtractedTextWithPositions> {
  if (typeof window === 'undefined') {
    throw new Error('extractTextWithPositions must be called client-side only');
  }

  // Dynamic import to avoid SSR issues
  const { pdfjs } = await import('react-pdf');
  
  // Configure worker
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const textItems: TextItem[] = [];
  const pageTexts: Array<{ page: number; text: string }> = [];
  let plainText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // ✅ CRITICAL: Use scale 2.0 for better coordinate precision
    // Higher scale = more accurate text positioning
    const viewport = page.getViewport({ scale: 2.0 });

    let pageText = '';

    console.log(`📄 Page ${pageNum} viewport:`, { width: viewport.width, height: viewport.height, scale: 2.0 });

    // ✅ STEP 1: Extract all text items with positions
    const pageItems: TextItem[] = [];
    
    textContent.items.forEach((item: any) => {
      if (!item.str || !item.str.trim()) return; // Skip empty items

      const text = item.str;
      
      // Calculate position (convert PDF coordinates to viewport coordinates)
      const transform = item.transform;
      
      // ✅ CRITICAL: Scale transform values by 2.0 to match viewport scale
      const scale = 2.0;
      const tx = transform[4] * scale; // X position (scaled)
      const ty = transform[5] * scale; // Y position (scaled)
      
      // ✅ Calculate accurate height from transform matrix
      // The transform matrix is [scaleX, skewY, skewX, scaleY, translateX, translateY]
      // Height = sqrt(skewX² + scaleY²) - this accounts for rotation and scaling
      const calculatedHeight = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]) * scale;
      
      // ✅ Width calculation with scaling
      const calculatedWidth = (item.width || (text.length * Math.abs(transform[0]))) * scale;
      
      pageItems.push({
        text,
        page: pageNum,
        x: tx,
        y: viewport.height - ty, // Flip Y coordinate (PDF origin is bottom-left)
        width: calculatedWidth,
        height: calculatedHeight,
        pageWidth: viewport.width,   // ✅ CRITICAL: Store viewport dimensions at scale 2.0
        pageHeight: viewport.height  // ✅ CRITICAL: Store viewport dimensions at scale 2.0
      });
    });

    // ✅ STEP 2: Sort items by READING ORDER (handle 2-column layout)
    // Research papers typically have 2 columns, so we need to sort:
    // 1. Top-to-bottom for position
    // 2. Left-to-right for columns
    const sortedItems = sortTextItemsByReadingOrder(pageItems, viewport.width);
    
    // ✅ STEP 3: Add sorted items to final arrays
    textItems.push(...sortedItems);
    
    // Build page text from sorted items
    sortedItems.forEach(item => {
      pageText += item.text + ' ';
      plainText += item.text + ' ';
    });

    pageTexts.push({ page: pageNum, text: pageText.trim() });
    
    console.log(`📖 Page ${pageNum}: Extracted ${sortedItems.length} text items in reading order`);
  }

  return {
    textItems,
    plainText: plainText.trim(),
    pageTexts,
  };
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