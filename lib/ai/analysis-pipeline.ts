import { analyzePaperWithGemini, type AnalysisResult } from "./gemini"
import { searchRelatedPapers, extractKeywords, type RelatedPaper } from "./exa-search"
import { extractTextFromPDF, type ParsedPDFResult } from "./pdf-parser"

export interface PipelineResult {
  analysis: AnalysisResult
  relatedPapers: RelatedPaper[]
  keywords: string[]
}

export async function runAnalysisPipeline(text: string, title: string): Promise<PipelineResult> {
  try {
    console.log("Starting analysis pipeline for:", title)

    // Step 1: Extract keywords for related paper search
    console.log("Extracting keywords...")
    const keywords = extractKeywords(text, title)

    // Step 2: Run Exa search first, then pass results to Gemini analysis
    console.log("Running related paper search (Exa)...")
    const relatedPapers = await searchRelatedPapers(title, keywords, 8)
    console.log("Running AI analysis with Exa context...")
    const analysis = await analyzePaperWithGemini(text, title, relatedPapers)

    console.log("Analysis pipeline completed successfully")

    return {
      analysis,
      relatedPapers,
      keywords,
    }
  } catch (error) {
    console.error("Analysis pipeline error:", error)
    throw new Error(`Analysis pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}