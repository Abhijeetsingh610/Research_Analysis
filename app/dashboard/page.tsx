"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { PaperCard } from "@/components/dashboard/paper-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"
import { trpc } from "@/lib/trpc/client"

export default function DashboardPage() {
  const [papers, setPapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = "/auth/login"
        return
      }
      setUser(user)

      // Fetch papers
      const { data: papers, error } = await supabase
        .from("papers")
        .select(`
          *,
          analysis (id, created_at),
          notes (id)
        `)
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })

      if (error) {
        console.error("Error fetching papers:", error)
      } else {
        setPapers(papers || [])
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  const handlePaperDelete = () => {
    // Refresh papers list
    if (user) {
      supabase
        .from("papers")
        .select(`
          *,
          analysis (id, created_at),
          notes (id)
        `)
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .then(({ data, error }) => {
          if (!error) {
            setPapers(data || [])
          }
        })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading your papers...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const papersData = papers
  const totalPapers = papersData.length
  const analyzedPapers = papersData.filter((paper) => paper.analysis && paper.analysis.length > 0).length
  const totalNotes = papersData.reduce((sum, paper) => sum + (paper.notes?.length || 0), 0)

  // Calculate recent activity (papers analyzed this week)
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const recentActivity = papersData.filter(
    (paper) => paper.analysis && paper.analysis.length > 0 && new Date(paper.analysis[0].created_at) > oneWeekAgo,
  ).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <DashboardHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Stats */}
          <DashboardStats
            totalPapers={totalPapers}
            analyzedPapers={analyzedPapers}
            totalNotes={totalNotes}
            recentActivity={recentActivity}
          />

          {/* Papers Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Your Papers</h2>
                <p className="text-muted-foreground">Manage and analyze your research papers</p>
              </div>

              {totalPapers > 0 && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search papers..." className="pl-10" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="analyzed">Analyzed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {totalPapers === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {papersData.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    onDelete={handlePaperDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
