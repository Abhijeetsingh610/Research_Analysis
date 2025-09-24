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
    text: string
    location: HighlightLocation
    explanation: string
  }>
  gaps: Array<{
    text: string
    location: HighlightLocation
    explanation: string
  }>
  suggestions: Array<{
    text: string
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
