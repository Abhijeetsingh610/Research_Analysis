import { useState } from "react"
import { pdfjs } from "react-pdf"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"

interface PDFTextExtractorProps {
  pdfUrl: string
  onExtracted: (text: string) => void
}

export function PDFTextExtractor({ pdfUrl, onExtracted }: PDFTextExtractorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function extractText() {
    setLoading(true)
    setError(null)
    try {
      const loadingTask = pdfjs.getDocument(pdfUrl)
      const pdf = await loadingTask.promise
      let fullText = ""
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        // Only use items with a 'str' property
        const pageText = textContent.items
          .map(item => 'str' in item ? (item as any).str : "")
          .join(" ")
        fullText += pageText + "\n"
      }
      setLoading(false)
      onExtracted(fullText)
    } catch (err) {
      setLoading(false)
      let message = "Failed to extract text"
      if (err && typeof err === "object" && "message" in err) {
        message = (err as any).message
      }
      setError(message)
    }
  }

  return (
    <div>
      <button onClick={extractText} disabled={loading}>
        {loading ? "Extracting..." : "Extract PDF Text"}
      </button>
      {error && <div className="pdf-text-extractor-error">{error}</div>}
    </div>
  )
}
