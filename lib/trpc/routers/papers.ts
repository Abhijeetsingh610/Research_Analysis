import { createTRPCRouter, protectedProcedure } from "../server"
import { z } from "zod"
import { deletePDF, extractFilePathFromUrl } from "@/lib/utils/file-upload"

export const papersRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    console.log("[v0] Fetching papers for user:", ctx.user.id)

    const { data: papers, error } = await ctx.supabase
      .from("papers")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("uploaded_at", { ascending: false })

    if (error) {
      console.error("[v0] Failed to fetch papers:", error)
      throw new Error("Failed to fetch papers")
    }

    console.log("[v0] Found papers:", papers.length)
    return papers
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    console.log("[v0] Fetching paper by ID:", input.id, "for user:", ctx.user.id)

    const { data: paper, error } = await ctx.supabase
      .from("papers")
      .select(`
          *,
          analysis (*),
          notes (*)
        `)
      .eq("id", input.id)
      .eq("user_id", ctx.user.id)
      .single()

    if (error) {
      console.error("[v0] Failed to fetch paper:", error)
      throw new Error("Failed to fetch paper")
    }

    console.log("[v0] Found paper:", paper.title)
    
    // Validate the file_url
    if (paper.file_url) {
      try {
        new URL(paper.file_url);
        console.log("[v0] Valid URL in paper record:", paper.file_url);
      } catch (urlError) {
        console.error("[v0] Invalid URL in paper record:", paper.file_url);
        // Don't throw an error here, but log it for debugging
      }
    }

    return paper
  }),

  upload: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required").max(200, "Title too long"),
        fileUrl: z.string().url("Invalid file URL"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      console.log("[v0] UPLOAD MUTATION STARTED")
      try {
        console.log("[v0] Upload mutation received input:", input)
        console.log("[v0] Creating paper record for user:", ctx.user.id)
        console.log("[v0] Paper title:", input.title)
        console.log("[v0] File URL:", input.fileUrl)

        // Validate the file URL
        try {
          new URL(input.fileUrl);
          console.log("[v0] Valid file URL provided");
        } catch (urlError) {
          console.error("[v0] Invalid file URL provided:", input.fileUrl);
          throw new Error(`Invalid file URL provided: ${input.fileUrl}`);
        }

        const { error: userError } = await ctx.supabase.from("users").upsert(
          {
            id: ctx.user.id,
            email: ctx.user.email || "",
            name: ctx.user.user_metadata?.name || ctx.user.user_metadata?.full_name || null,
          },
          {
            onConflict: "id",
          },
        )

        if (userError) {
          console.error("[v0] Failed to ensure user exists:", userError)
          throw new Error(`Failed to ensure user exists: ${userError.message}`)
        }

        console.log("[v0] User record ensured, inserting paper...")

        const { data: paper, error } = await ctx.supabase
          .from("papers")
          .insert({
            title: input.title,
            file_url: input.fileUrl,
            user_id: ctx.user.id,
          })
          .select()
          .single()

        if (error) {
          console.error("[v0] Database error:", error)
          throw new Error(`Failed to create paper record: ${error.message}`)
        }

        console.log("[v0] Paper record created successfully:", paper.id)
        const response = {
          id: paper.id,
          title: paper.title,
          file_url: paper.file_url,
          user_id: paper.user_id,
          uploaded_at: paper.uploaded_at ? new Date(paper.uploaded_at).toISOString() : new Date().toISOString(),
        }
        console.log("[v0] Upload mutation response:", response)
        return response
      } catch (error) {
        console.error("[v0] Upload mutation error:", error)
        if (error instanceof Error) {
          throw new Error(error.message)
        }
        throw new Error("Failed to create paper record")
      }
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    // First get the paper to extract file path
    const { data: paper, error: fetchError } = await ctx.supabase
      .from("papers")
      .select("file_url")
      .eq("id", input.id)
      .eq("user_id", ctx.user.id)
      .single()

    if (fetchError) {
      throw new Error("Paper not found")
    }

    // Delete from storage
    try {
      const filePath = extractFilePathFromUrl(paper.file_url)
      await deletePDF(filePath)
    } catch (storageError) {
      console.error("Failed to delete file from storage:", storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error } = await ctx.supabase.from("papers").delete().eq("id", input.id).eq("user_id", ctx.user.id)

    if (error) {
      throw new Error("Failed to delete paper")
    }

    return { success: true }
  }),
})