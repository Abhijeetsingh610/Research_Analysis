import { createTRPCRouter, protectedProcedure } from "../server"
import { z } from "zod"

const HighlightLocationSchema = z.object({
  page: z.number(),
  textSpan: z.object({
    start: z.number(),
    end: z.number(),
  }),
  boundingRect: z
    .object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  rects: z.array(z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    width: z.number(),
    height: z.number(),
  })).optional(),
})

export const notesRouter = createTRPCRouter({
  list: protectedProcedure.input(z.object({ paperId: z.string() })).query(async ({ ctx, input }) => {
    const { data: notes, error } = await ctx.supabase
      .from("notes")
      .select("*")
      .eq("paper_id", input.paperId)
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error("Failed to fetch notes")
    }

    return notes
  }),

  // For compatibility with frontend expecting notes.create
  create: protectedProcedure
    .input(
      z.object({
        paper_id: z.string(),
        note_text: z.string(),
        selected_text: z.string().optional(),
        highlight_location: HighlightLocationSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: note, error } = await ctx.supabase
        .from("notes")
        .insert({
          paper_id: input.paper_id,
          user_id: ctx.user.id,
          highlight_location: input.highlight_location,
          note_text: input.note_text,
          selected_text: input.selected_text,
        })
        .select()
        .single()

      if (error) {
        throw new Error("Failed to create note")
      }

      return note
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        noteText: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data: note, error } = await ctx.supabase
        .from("notes")
        .update({ note_text: input.noteText })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .single()

      if (error) {
        throw new Error("Failed to update note")
      }

      return note
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.supabase.from("notes").delete().eq("id", input.id).eq("user_id", ctx.user.id)

    if (error) {
      throw new Error("Failed to delete note")
    }

    return { success: true }
  }),
})
