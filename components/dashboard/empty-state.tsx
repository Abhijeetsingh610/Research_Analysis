"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Upload, Brain } from "lucide-react"
import Link from "next/link"

export function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-6">
          <div className="relative">
            <div className="p-4 bg-muted rounded-full">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 p-1 bg-primary rounded-full">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-2">No papers yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upload your first research paper to get started with AI-powered analysis. Discover strengths, identify gaps,
          and get actionable insights.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <Link href="/upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First Paper
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/demo">
              <Brain className="h-4 w-4 mr-2" />
              View Demo
            </Link>
          </Button>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p>Supported formats: PDF • Max size: 50MB</p>
        </div>
      </CardContent>
    </Card>
  )
}
