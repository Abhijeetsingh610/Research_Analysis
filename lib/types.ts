export interface User {
  id: string
  email: string
  name?: string
  created_at: string
}

export interface Paper {
  id: string
  user_id: string
  file_url: string
  title: string
  uploaded_at: string
}

export interface Analysis {
  id: string
  paper_id: string
  strengths: Array<{
    text: string // The analysis point
    chunk: string // The supporting chunk from the paper
    location: HighlightLocation // Where in the PDF
    explanation: string // LLM explanation
  }>
  gaps: Array<{
    text: string // The gap analysis point
    chunk: string // The supporting chunk from the paper
    location: HighlightLocation
    explanation: string
    exaContext?: Array<{
      title: string
      url: string
      snippet: string
      publishedAt?: string
    }>
  }>
  suggestions: Array<{
    text: string
    chunk?: string // Optional: supporting chunk
    location?: HighlightLocation
    category: string
    priority: "high" | "medium" | "low"
  }>
  created_at: string
}

export interface Note {
  id: string
  paper_id: string
  user_id: string
  highlight_location: HighlightLocation
  note_text: string
  selected_text?: string
  created_at: string
}

export interface HighlightLocation {
  page: number
  textSpan: {
    start: number
    end: number
  }
  boundingRect?: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
  }
  rects?: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
  }>
}

export interface UploadPaperInput {
  title: string
  file: File
}

export interface CreateNoteInput {
  paper_id: string
  highlight_location: HighlightLocation
  note_text: string
}
