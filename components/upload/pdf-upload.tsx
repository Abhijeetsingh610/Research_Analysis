"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Upload, X } from "lucide-react"
import { uploadPDF } from "@/lib/utils/file-upload"
import { trpc } from "@/lib/trpc/client"
import { useAuth } from "@/components/auth/auth-provider"
import { useRouter } from "next/navigation"

interface UploadedFile {
  file: File
  preview: string
}

function truncateFileName(fileName: string, maxLength = 30): string {
  if (fileName.length <= maxLength) return fileName
  const extension = fileName.split(".").pop()
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf("."))
  const truncatedName = nameWithoutExt.substring(0, maxLength - 3 - (extension?.length || 0))
  return `${truncatedName}...${extension ? `.${extension}` : ""}`
}

export function PDFUpload() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [title, setTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()

  const uploadPaperMutation = trpc.papers.upload.useMutation({
    onSuccess: (paper) => {
      console.log("[v0] Paper uploaded successfully:", paper.id)
      router.push(`/papers/${paper.id}`)
    },
    onError: (error) => {
      console.error("[v0] tRPC upload error:", error)
      setError(`Upload failed: ${error.message}`)
      setIsUploading(false)
      setUploadProgress(0)
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === "application/pdf") {
      setUploadedFile({
        file,
        preview: URL.createObjectURL(file),
      })
      const titleFromFile = file.name.replace(".pdf", "")
      setTitle(titleFromFile.length > 100 ? titleFromFile.substring(0, 100) : titleFromFile)
      setError(null)
    } else {
      setError("Please upload a PDF file")
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  })

  const removeFile = () => {
    if (uploadedFile) {
      URL.revokeObjectURL(uploadedFile.preview)
      setUploadedFile(null)
      setTitle("")
      setError(null)
    }
  }

  const handleUpload = async () => {
    console.log("[v0] Starting upload process")
    console.log("[v0] User:", user ? user.id : "none")
    console.log("[v0] File:", uploadedFile?.file.name)
    console.log("[v0] Title:", title.trim())

    if (!uploadedFile || !user || !title.trim()) {
      setError("Please provide a title and select a file")
      return
    }

    if (loading) {
      setError("Please wait for authentication to complete")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      console.log("[v0] Uploading file to storage...")
      // Upload file to Supabase Storage
      const uploadResult = await uploadPDF(uploadedFile.file, user.id)

      clearInterval(progressInterval)
      setUploadProgress(95)

      if (!uploadResult || !uploadResult.url) {
        setError("File upload failed: No URL returned from storage.")
        setIsUploading(false)
        setUploadProgress(0)
        return
      }

      const payload = {
        title: title.trim(),
        fileUrl: uploadResult.url,
      }
      console.log("[v0] Upload mutation payload:", payload)
      // Create paper record in database
      await uploadPaperMutation.mutateAsync(payload)

      setUploadProgress(100)
    } catch (error) {
      console.error("[v0] Upload process error:", error)
      setError(error instanceof Error ? error.message : "Upload failed")
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Show loading state if auth is still loading
  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <p>Loading...</p>
        </CardContent>
      </Card>
    )
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <p className="mb-4">Please log in to upload papers</p>
          <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Research Paper
        </CardTitle>
        <CardDescription>Upload a PDF file to analyze its strengths, gaps, and get AI-powered insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!uploadedFile ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the PDF file here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop a PDF file here, or click to select</p>
                <p className="text-sm text-muted-foreground">Maximum file size: 50MB</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate" title={uploadedFile.file.name}>
                    {truncateFileName(uploadedFile.file.name)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={removeFile} disabled={isUploading} className="flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Paper Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title for this paper"
                disabled={isUploading}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/200 characters</p>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleUpload} disabled={isUploading || !title.trim()} className="flex-1">
                {isUploading ? "Uploading..." : "Upload & Analyze"}
              </Button>
              <Button variant="outline" onClick={removeFile} disabled={isUploading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
