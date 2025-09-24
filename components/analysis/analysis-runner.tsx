"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Brain, Search, FileText, CheckCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"


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
    // Use PDFTextExtractor logic directly
    try {
      // Use pdfjs directly to extract text
      const { pdfjs } = await import("react-pdf")
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"
      const loadingTask = pdfjs.getDocument(pdfUrl)
      const pdf = await loadingTask.promise
      let fullText = ""
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map(item => 'str' in item ? (item as any).str : "")
          .join(" ")
        fullText += pageText + "\n"
        console.log(`Page ${i} text:`, pageText.substring(0, 200))
      }
      console.log("Full extracted text length:", fullText.length)
      console.log("Full extracted text preview:", fullText.substring(0, 500))
      setExtractedText(fullText)
      setExtracting(false)
      setProgress(30)
      setCurrentStep("Text extraction complete.")
      return fullText
    } catch (err) {
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
    if (!text) {
      try {
        text = await handleExtractText()
      } catch (err) {
        setIsRunning(false)
        return
      }
    }

    if (!title || !text) {
      setError("Title or PDF text missing.")
      setIsRunning(false)
      return
    }

    console.log("Running analysis with title:", title)
    console.log("Text length:", text.length)
    console.log("Text preview:", text.substring(0, 200))

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
      await runAnalysisMutation.mutateAsync({ paperId, title, text })
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
