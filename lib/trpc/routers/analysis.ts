import { createTRPCRouter, protectedProcedure } from "../server"
import { z } from "zod"
import { runAnalysisPipeline } from "@/lib/ai/analysis-pipeline"

const HighlightLocationSchema = z.object({
  page: z.number(),
  textSpan: z.object({
    start: z.number(),
    end: z.number(),
  }),
  boundingRect: z
    .object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
})

export const analysisRouter = createTRPCRouter({
  run: protectedProcedure.input(z.object({
    paperId: z.string(),
    title: z.string(),
    text: z.string()
  })).mutation(async ({ ctx, input }) => {
    // Run the AI analysis pipeline with extracted text
    try {
      const pipelineResult = await runAnalysisPipeline(input.text, input.title)

      // Save analysis results to database
      const { data: analysis, error: analysisError } = await ctx.supabase
        .from("analysis")
        .insert({
          paper_id: input.paperId,
          strengths: pipelineResult.analysis.strengths,
          gaps: pipelineResult.analysis.gaps,
          suggestions: pipelineResult.analysis.suggestions,
        })
        .select()
        .single()

      if (analysisError) {
        throw new Error("Failed to save analysis results")
      }

      return {
        analysis,
        relatedPapers: pipelineResult.relatedPapers,
        keywords: pipelineResult.keywords,
      }
    } catch (error) {
      console.error("Analysis error:", error)
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }),

  getByPaperId: protectedProcedure.input(z.object({ paperId: z.string() })).query(async ({ ctx, input }) => {
    const { data: analysis, error } = await ctx.supabase
      .from("analysis")
      .select("*")
      .eq("paper_id", input.paperId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found"
      throw new Error("Failed to fetch analysis")
    }

    return analysis
  }),

  delete: protectedProcedure.input(z.object({ paperId: z.string() })).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.supabase.from("analysis").delete().eq("paper_id", input.paperId)

    if (error) {
      throw new Error("Failed to delete analysis")
    }

    return { success: true }
  }),
})