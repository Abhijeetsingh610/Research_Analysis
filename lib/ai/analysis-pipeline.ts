

import { analyzePaperWithGemini, extractSearchQueriesWithGemini } from "./gemini"
import type { AnalysisResult } from "./gemini"
import { searchRelatedPapers } from "./exa-search"
import type { RelatedPaper } from "./exa-search"
import { extractTextFromPDF } from "./pdf-parser"

export interface PipelineResult {
  analysis: AnalysisResult;
  relatedPapers: RelatedPaper[];
  searchQueries: string[];
}


export async function runAnalysisPipeline(text: string, title: string): Promise<PipelineResult> {
  try {
    console.log("Starting collaborative analysis pipeline for:", title)

    // Step 1: Use Gemini to extract search queries from the paper
    console.log("Extracting search queries with Gemini...")
    const searchQueries = await extractSearchQueriesWithGemini(text, title)

    // Step 2: Use Exa to fetch related papers using Gemini's queries
    console.log("Running related paper search (Exa) with Gemini queries...")
    const relatedPapers = await searchRelatedPapers(title, searchQueries, 8)

    // Step 3: Run Gemini analysis with Exa context
    console.log("Running AI analysis with Exa context...")
    const analysis = await analyzePaperWithGemini(text, title, relatedPapers)

    console.log("Collaborative analysis pipeline completed successfully")

    return {
      analysis,
      relatedPapers,
      searchQueries,
    }
  } catch (error) {
    console.error("Analysis pipeline error:", error)
    throw new Error(`Analysis pipeline failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}