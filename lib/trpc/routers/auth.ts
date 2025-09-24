import { createTRPCRouter, protectedProcedure } from "../server"
import { z } from "zod"

export const authRouter = createTRPCRouter({
  getUser: protectedProcedure.query(async ({ ctx }) => {
    const { data: user, error } = await ctx.supabase.from("users").select("*").eq("id", ctx.user.id).single()

    if (error) {
      throw new Error("Failed to fetch user")
    }

    return user
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase.from("users").update(input).eq("id", ctx.user.id).select().single()

      if (error) {
        throw new Error("Failed to update profile")
      }

      return data
    }),
})
