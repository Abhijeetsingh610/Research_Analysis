import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PDFUpload } from "@/components/upload/pdf-upload"

export default async function UploadPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Research Paper</h1>
          <p className="text-muted-foreground">Upload your PDF to get AI-powered analysis and insights</p>
        </div>
        <PDFUpload />
      </div>
    </div>
  )
}
