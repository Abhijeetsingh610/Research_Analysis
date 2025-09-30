import { analyzePaperWithGemini, extractSearchQueriesWithGemini } from "./gemini"
import type { AnalysisResult } from "./gemini"
import { searchRelatedPapers } from "./exa-search"
import type { RelatedPaper } from "./exa-search"
import { extractTextFromPDF, type TextItem } from "./pdf-parser"
import { mapTextToCoordinates, type TextItem as MapperTextItem } from "@/lib/utils/text-to-coordinates"

export interface PipelineResult {
  analysis: AnalysisResult;
  relatedPapers: RelatedPaper[];
  searchQueries: string[];
}

/**
 * Enhances analysis results with PDF coordinates by mapping text chunks to their positions
 */
function enhanceAnalysisWithCoordinates(
  analysis: AnalysisResult,
  textItems: TextItem[]
): AnalysisResult {
  console.log(`📍 Mapping coordinates for ${textItems.length} text items...`)
  
  // Debug: Check structure of first item
  if (textItems.length > 0) {
    console.log("First textItem structure:", JSON.stringify(textItems[0], null, 2))
    console.log("Viewport dimensions:", {
      pageWidth: textItems[0].pageWidth,
      pageHeight: textItems[0].pageHeight
    })
  }

  // Convert TextItem[] to MapperTextItem[] format
  // The items already have x, y, width, height - no transform matrix needed!
  const mapperTextItems: MapperTextItem[] = textItems
    .filter(item => {
      // Check if item has required coordinate properties
      const hasCoordinates = 
        typeof item.x === 'number' && 
        typeof item.y === 'number' && 
        typeof item.width === 'number' && 
        typeof item.height === 'number' &&
        item.text && 
        typeof item.text === 'string'
      
      if (!hasCoordinates && textItems.indexOf(item) < 3) {
        console.log(`Item ${textItems.indexOf(item)} missing coordinates:`, item)
      }
      return hasCoordinates
    })
    .map(item => ({
      text: item.text,
      pageNumber: item.page || item.pageNumber || 1,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      pageWidth: item.pageWidth,   // Include viewport dimensions
      pageHeight: item.pageHeight
    }))
  
  console.log(`✅ Converted ${mapperTextItems.length} items with coordinates`)

  // Helper to enhance items with coordinates
  const enhanceItems = <T extends { chunk?: string; location?: any }>(
    items: T[],
    type: string
  ): T[] => {
    return items.map((item, index) => {
      if (!item.chunk) {
        console.log(`⚠️ ${type} #${index + 1}: No chunk text found`)
        return item
      }

      const coords = mapTextToCoordinates(item.chunk, mapperTextItems)
      
      if (coords !== null) {
        console.log(`✅ ${type} #${index + 1}: Found coordinates - page ${coords.pageNumber}, rects: ${coords.rects?.length || 0}`)
        if (coords.rects && coords.rects.length > 0) {
          console.log(`   First rect:`, coords.rects[0])
        }
        return {
          ...item,
          location: {
            page: coords.pageNumber,
            boundingRect: coords.boundingRect,
            rects: coords.rects  // ✅ Include rects array!
          }
        }
      } else {
        console.log(`⚠️ ${type} #${index + 1}: No coordinates found for chunk`)
        return item
      }
    })
  }

  // Enhance all analysis items
  const enhancedAnalysis: AnalysisResult = {
    strengths: enhanceItems(analysis.strengths, "Strength"),
    gaps: enhanceItems(analysis.gaps, "Gap"),
    suggestions: enhanceItems(analysis.suggestions, "Suggestion")
  }

  console.log("✅ Coordinate mapping completed")
  return enhancedAnalysis
}

export async function runAnalysisPipeline(
  text: string, 
  title: string, 
  textItems?: TextItem[]
): Promise<PipelineResult> {
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
    let analysis = await analyzePaperWithGemini(text, title, relatedPapers)

    // Step 4: Enhance analysis with PDF coordinates (if textItems provided)
    if (textItems && textItems.length > 0) {
      console.log("Enhancing analysis with PDF coordinates...")
      analysis = enhanceAnalysisWithCoordinates(analysis, textItems)
    } else {
      console.log("⚠️ No textItems provided - skipping coordinate mapping")
    }

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