import { createClient } from "@/lib/supabase/client"

export interface UploadResult {
  url: string
  path: string
}

export async function uploadPDF(file: File, userId: string): Promise<UploadResult> {
  console.log("[v0] Starting PDF upload for user:", userId)

  const supabase = createClient()

  // Validate file type
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed")
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    throw new Error("File size must be less than 50MB")
  }

  const timestamp = Date.now()
  const baseName = file.name.replace(".pdf", "").substring(0, 50)
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, "_")
  const fileName = `${timestamp}_${sanitizedName}.pdf`
  const filePath = `${userId}/${fileName}`

  console.log("[v0] Uploading file to path:", filePath)

  try {
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage.from("papers").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("[v0] Storage upload error:", error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    console.log("[v0] File uploaded successfully:", data.path)

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("papers").getPublicUrl(filePath)

    console.log("[v0] Generated public URL:", publicUrl)

    if (!publicUrl) {
      throw new Error("Failed to generate public URL")
    }

    // Validate that the URL is actually a valid URL
    try {
      new URL(publicUrl);
      console.log("[v0] Valid URL generated");
    } catch (urlError) {
      console.error("[v0] Invalid URL generated:", publicUrl);
      throw new Error(`Invalid URL generated: ${publicUrl}`);
    }

    return {
      url: publicUrl,
      path: filePath,
    }
  } catch (error) {
    console.error("[v0] Upload process error:", error)
    throw error instanceof Error ? error : new Error("Upload failed")
  }
}

export async function deletePDF(filePath: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage.from("papers").remove([filePath])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

export function extractFilePathFromUrl(url: string): string {
  // Extract file path from Supabase storage URL
  const urlParts = url.split("/storage/v1/object/public/papers/")
  return urlParts[1] || ""
}