import { GoogleGenerativeAI } from "@google/generative-ai"
import { type ParsedPDFResult } from "./pdf-parser"

const apiKey = process.env.GEMINI_API_KEY
console.log("GEMINI_API_KEY loaded:", apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : "No")

export interface AnalysisResult {
  strengths: Array<{
    text: string
    location: {
      page: number
      textSpan: { start: number; end: number }
    }
    explanation: string
  }>
  gaps: Array<{
    text: string
    location: {
      page: number
      textSpan: { start: number; end: number }
    }
    explanation: string
  }>
  suggestions: Array<{
    text: string
    category: string
    priority: "high" | "medium" | "low"
  }>
}

export async function analyzePaperWithGemini(text: string, title: string): Promise<AnalysisResult> {
  console.log("analyzePaperWithGemini called with text length:", text.length)
  console.log("Text preview:", text.substring(0, 200))

  if (!text || text.trim().length < 100) {
    console.warn("Text is too short or empty, returning mock analysis")
    return {
      strengths: [{
        text: "Sample strength text",
        location: { page: 1, textSpan: { start: 0, end: 50 } },
        explanation: "This is a sample strength for demonstration purposes."
      }],
      gaps: [{
        text: "Sample gap text", 
        location: { page: 1, textSpan: { start: 50, end: 100 } },
        explanation: "This is a sample gap for demonstration purposes."
      }],
      suggestions: [{
        text: "Sample suggestion",
        category: "Methodology",
        priority: "high" as const
      }]
    }
  }

  const genAI = new GoogleGenerativeAI(apiKey!)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

  const prompt = `
You are an expert research paper analyst. Analyze the following research paper and provide:

1. STRENGTHS: Identify 3-5 key strengths of the paper with specific text excerpts and explanations
2. GAPS: Identify 3-5 research gaps, limitations, or areas for improvement with specific text excerpts and explanations  
3. SUGGESTIONS: Provide 5-7 actionable suggestions for improvement with categories and priority levels

Paper Title: ${title}

Paper Content:
${text}

Please respond in the following JSON format:
{
  "strengths": [
    {
      "text": "specific text excerpt from paper",
      "location": {"page": 1, "textSpan": {"start": 100, "end": 200}},
      "explanation": "detailed explanation of why this is a strength"
    }
  ],
  "gaps": [
    {
      "text": "specific text excerpt highlighting the gap",
      "location": {"page": 2, "textSpan": {"start": 300, "end": 400}},
      "explanation": "detailed explanation of the gap or limitation"
    }
  ],
  "suggestions": [
    {
      "text": "specific actionable suggestion",
      "category": "Methodology|Literature Review|Data Analysis|Writing|Future Work",
      "priority": "high|medium|low"
    }
  ]
}

Focus on:
- Methodology rigor and appropriateness
- Literature review completeness and currency
- Data analysis quality and statistical validity
- Clarity of writing and presentation
- Novelty and significance of contributions
- Limitations and potential biases
- Future research directions

Provide specific, actionable feedback that would help improve the paper.
`

  try {
    console.log("Calling Gemini API...")
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    console.log("Gemini response received, length:", text.length)
    console.log("Gemini response preview:", text.substring(0, 500))

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("No JSON found in response:", text)
      throw new Error("Failed to extract JSON from Gemini response")
    }

    console.log("JSON extracted:", jsonMatch[0])
    const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult
    console.log("Analysis parsed successfully:", {
      strengths: analysis.strengths?.length || 0,
      gaps: analysis.gaps?.length || 0,
      suggestions: analysis.suggestions?.length || 0
    })
    
    // Validate and enhance the location information
    const enhancedAnalysis = {
      ...analysis,
      strengths: analysis.strengths.map(strength => ({
        ...strength,
        location: {
          page: strength.location?.page || 1,
          textSpan: {
            start: Math.max(0, strength.location?.textSpan?.start || 0),
            end: Math.max((strength.location?.textSpan?.start || 0) + 1, strength.location?.textSpan?.end || 1)
          }
        }
      })),
      gaps: analysis.gaps.map(gap => ({
        ...gap,
        location: {
          page: gap.location?.page || 1,
          textSpan: {
            start: Math.max(0, gap.location?.textSpan?.start || 0),
            end: Math.max((gap.location?.textSpan?.start || 0) + 1, gap.location?.textSpan?.end || 1)
          }
        }
      }))
    }
    
    return enhancedAnalysis
  } catch (error) {
    console.error("Gemini analysis error:", error)
    throw new Error("Failed to analyze paper with Gemini")
  }
}