"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Brain, MessageSquare, TrendingUp } from "lucide-react"

interface DashboardStatsProps {
  totalPapers: number
  analyzedPapers: number
  totalNotes: number
  recentActivity: number
}

export function DashboardStats({ totalPapers, analyzedPapers, totalNotes, recentActivity }: DashboardStatsProps) {
  const analysisRate = totalPapers > 0 ? Math.round((analyzedPapers / totalPapers) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Papers</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPapers}</div>
          <p className="text-xs text-muted-foreground">Research papers uploaded</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Analyzed</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analyzedPapers}</div>
          <p className="text-xs text-muted-foreground">{analysisRate}% completion rate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Notes</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalNotes}</div>
          <p className="text-xs text-muted-foreground">Personal annotations</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentActivity}</div>
          <p className="text-xs text-muted-foreground">Papers analyzed</p>
        </CardContent>
      </Card>
    </div>
  )
}
