"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileText, MoreVertical, Eye, Play, Trash2, Calendar, CheckCircle, Clock } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import Link from "next/link"
import { truncateString } from "@/lib/utils"
import type { Paper } from "@/lib/types"

interface PaperCardProps {
  paper: Paper & {
    analysis?: Array<{ id: string; created_at: string }>
    notes?: Array<{ id: string }>
  }
  onDelete: () => void
}

export function PaperCard({ paper, onDelete }: PaperCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deletePaperMutation = trpc.papers.delete.useMutation({
    onSuccess: () => {
      onDelete()
      setShowDeleteDialog(false)
    },
    onError: (error) => {
      console.error("Failed to delete paper:", error)
    },
    onSettled: () => {
      setIsDeleting(false)
    },
  })

  const handleDelete = () => {
    setIsDeleting(true)
    deletePaperMutation.mutate({ id: paper.id })
  }

  const hasAnalysis = paper.analysis && paper.analysis.length > 0
  const notesCount = paper.notes?.length || 0
  const uploadDate = new Date(paper.uploaded_at).toLocaleDateString()

  const getStatusBadge = () => {
    if (hasAnalysis) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Analyzed
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Pending Analysis
      </Badge>
    )
  }

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 bg-red-50 rounded-lg">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg line-clamp-2 mb-1">{paper.title}</CardTitle>
                <CardDescription className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {uploadDate}
                  </span>
                  {notesCount > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {notesCount} notes
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/papers/${paper.id}`} className="flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    View Paper
                  </Link>
                </DropdownMenuItem>
                {!hasAnalysis && (
                  <DropdownMenuItem asChild>
                    <Link href={`/papers/${paper.id}/analyze`} className="flex items-center">
                      <Play className="h-4 w-4 mr-2" />
                      Run Analysis
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">{getStatusBadge()}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/papers/${paper.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Link>
              </Button>
              {!hasAnalysis && (
                <Button size="sm" asChild>
                  <Link href={`/papers/${paper.id}/analyze`}>
                    <Play className="h-4 w-4 mr-1" />
                    Analyze
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Paper</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{truncateString(paper.title, 50)}"? This action cannot be undone and will also delete all
              associated analysis and notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
