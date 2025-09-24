"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import dynamic from "next/dynamic"
const PDFViewer = dynamic(() => import("@/components/pdf/pdf-viewer-wrapper"), { ssr: false })
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, BarChart3 } from "lucide-react"
import Link from "next/link"
import { truncateString } from "@/lib/utils"

export default function PaperPage() {
  const params = useParams()
  const id = params.id as string
  const [paper, setPaper] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const checkAuthAndFetchPaper = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = "/auth/login"
        return
      }
      setUser(user)

      // Fetch paper with analysis and notes
      const { data: paper, error } = await supabase
        .from("papers")
        .select(`*, analysis (*), notes (*)`)
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      console.log("Fetched paper:", paper)
      console.log("Analysis data:", paper?.analysis)

      if (error || !paper) {
        window.location.href = "/dashboard"
        return
      }

      setPaper(paper)
      setLoading(false)
    }

    checkAuthAndFetchPaper()
  }, [id])

  if (loading || !paper) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading paper...</p>
        </div>
      </div>
    )
  }

  const analysis = paper.analysis?.[0] || null
  const notes = paper.notes || []

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold">{truncateString(paper.title, 60)}</h1>
              <p className="text-sm text-muted-foreground">
                Uploaded {new Date(paper.uploaded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!analysis && (
              <Button size="sm" asChild>
                <Link href={`/papers/${paper.id}/analyze`}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Analysis
                </Link>
              </Button>
            )}
            {analysis && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/papers/${paper.id}/analyze`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analysis
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1">
        <PDFViewer paperId={paper.id} pdfUrl={paper.file_url} analysis={analysis} notes={notes} />
      </div>
    </div>
  )
}