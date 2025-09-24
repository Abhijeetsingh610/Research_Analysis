"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AnalysisRunner } from "@/components/analysis/analysis-runner"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { truncateString } from "@/lib/utils"

export default function AnalyzePage() {
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

      // Fetch paper details
      const { data: paper, error } = await supabase.from("papers").select("*").eq("id", id).eq("user_id", user.id).single()

      if (error || !paper) {
        window.location.href = "/dashboard"
        return
      }

      setPaper(paper)
      setLoading(false)
    }

    checkAuthAndFetchPaper()
  }, [id])

  const handleAnalysisComplete = () => {
    window.location.href = `/papers/${id}`
  }

  if (loading || !paper) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading paper analysis...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Analyze Paper</h1>
            <p className="text-muted-foreground mb-2">{truncateString(paper.title, 70)}</p>
            <p className="text-sm text-muted-foreground">Uploaded {new Date(paper.uploaded_at).toLocaleDateString()}</p>
          </div>
        </div>

        <AnalysisRunner
          paperId={paper.id}
          title={paper.title}
          pdfUrl={paper.file_url}
          onAnalysisComplete={handleAnalysisComplete}
        />
      </div>
    </div>
  )
}
