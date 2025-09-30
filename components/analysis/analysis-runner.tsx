"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Brain, Search, FileText, CheckCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { extractTextWithPositions, type TextItem } from "@/lib/ai/pdf-parser"

import { PDFTextExtractor } from "@/components/pdf/PDFTextExtractor"

interface AnalysisRunnerProps {
  paperId: string
  title: string
  pdfUrl: string
  onAnalysisComplete: () => void
}

export function AnalysisRunner({ paperId, title, pdfUrl, onAnalysisComplete }: AnalysisRunnerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const [extractedTextItems, setExtractedTextItems] = useState<TextItem[] | null>(null)
  const [extracting, setExtracting] = useState(false)

  const runAnalysisMutation = trpc.analysis.run.useMutation({
    onSuccess: () => {
      setProgress(100)
      setCurrentStep("Analysis completed!")
      setTimeout(() => {
        setIsRunning(false)
        onAnalysisComplete()
      }, 1000)
    },
    onError: (error) => {
      setError(error.message)
      setIsRunning(false)
      setProgress(0)
      setCurrentStep("")
    },
  })

  const deleteAnalysisMutation = trpc.analysis.delete.useMutation()

  const handleExtractText = async () => {
    setExtracting(true)
    setCurrentStep("Extracting text from PDF...")
    setProgress(10)
    
    try {
      console.log("📄 Extracting text with positions...")
      
      // Fetch the PDF as a Blob
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const file = new File([blob], "document.pdf", { type: "application/pdf" })
      
      // Extract text with positions
      const { plainText, textItems } = await extractTextWithPositions(file)
      
      console.log(`✅ Extracted ${plainText.length} chars, ${textItems.length} text items`)
      console.log("Text preview:", plainText.substring(0, 200))
      
      // Debug: Check if viewport dimensions are captured
      if (textItems.length > 0) {
        console.log("🔍 First text item:", textItems[0])
        console.log("📐 Viewport dimensions:", {
          pageWidth: textItems[0].pageWidth,
          pageHeight: textItems[0].pageHeight
        })
      }
      
      // Store both text and textItems
      setExtractedText(plainText)
      setExtractedTextItems(textItems)
      setExtracting(false)
      setProgress(30)
      setCurrentStep("Text extraction complete.")
      
      return { plainText, textItems }
    } catch (err) {
      console.error("Text extraction error:", err)
      setExtracting(false)
      setError("Failed to extract text from PDF.")
      throw err
    }
  }

  const handleRunAnalysis = async () => {
    setIsRunning(true)
    setProgress(0)
    setError(null)

    let text = extractedText
    let items = extractedTextItems
    
    if (!text) {
      try {
        const result = await handleExtractText()
        text = result.plainText
        items = result.textItems
      } catch (err) {
        setIsRunning(false)
        return
      }
    }

    console.log("DEBUG - title:", title)
    console.log("DEBUG - text:", text ? `${text.length} chars` : "NULL/EMPTY")
    console.log("DEBUG - items:", items ? `${items.length} items` : "NULL/EMPTY")

    if (!title || !text) {
      const missingParts = []
      if (!title) missingParts.push("title")
      if (!text) missingParts.push("PDF text")
      setError(`Missing: ${missingParts.join(" and ")}`)
      setIsRunning(false)
      return
    }

    console.log("Running analysis with title:", title)
    console.log("Text length:", text.length)
    console.log("Text preview:", text.substring(0, 200))
    console.log("TextItems count:", items?.length || 0)

    // Delete existing analysis first
    setCurrentStep("Clearing previous analysis...")
    try {
      await deleteAnalysisMutation.mutateAsync({ paperId })
    } catch (e) {
      // Ignore errors if no existing analysis
      console.log("No existing analysis to delete or delete failed:", e)
    }

    setCurrentStep("Analyzing with AI...")
    setProgress(60)
    try {
      await runAnalysisMutation.mutateAsync({ 
        paperId, 
        title, 
        text,
        textItems: items 
      })
    } catch (err) {
      setError("Analysis failed.")
      setIsRunning(false)
      setProgress(0)
      setCurrentStep("")
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Paper Analysis
        </CardTitle>
        <CardDescription>
          Run comprehensive AI analysis to identify strengths, gaps, and get improvement suggestions
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isRunning ? (
          <div className="text-center space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <FileText className="h-8 w-8 text-blue-500 mb-2" />
                <h3 className="font-medium">Text Extraction</h3>
                <p className="text-sm text-muted-foreground text-center">Extract and process PDF content</p>
              </div>
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <Brain className="h-8 w-8 text-purple-500 mb-2" />
                <h3 className="font-medium">AI Analysis</h3>
                <p className="text-sm text-muted-foreground text-center">Identify strengths and gaps with Gemini</p>
              </div>
              <div className="flex flex-col items-center p-4 border rounded-lg">
                <Search className="h-8 w-8 text-green-500 mb-2" />
                <h3 className="font-medium">Related Research</h3>
                <p className="text-sm text-muted-foreground text-center">Find relevant papers with Exa Search</p>
              </div>
            </div>

            <Button
              onClick={handleRunAnalysis}
              size="lg"
              className="w-full"
              disabled={extracting || isRunning || !title || !pdfUrl}
            >
              <Play className="h-4 w-4 mr-2" />
              {extracting ? "Extracting PDF Text..." : "Start AI Analysis"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-medium">{currentStep}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              This may take a few minutes. Please don't close this page.
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {progress === 100 && !error && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Analysis completed successfully! Redirecting to results...</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
