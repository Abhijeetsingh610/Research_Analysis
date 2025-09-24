import { initTRPC, TRPCError } from "@trpc/server"
import { createClient } from "@/lib/supabase/server"
import superjson from "superjson"

// Create context for tRPC
export const createTRPCContext = async (opts?: { req?: Request }) => {
  console.log("[v0] Creating tRPC context")

  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.log("[v0] Auth error in tRPC context:", error.message)
      // Don't throw here, just log and continue with null user
    }

    console.log("[v0] tRPC context created, user:", user ? user.id : "none")

    return {
      supabase,
      user: user || null,
    }
  } catch (error) {
    console.error("[v0] Failed to create tRPC context:", error)
    const supabase = await createClient()
    return {
      supabase,
      user: null,
    }
  }
}

// Initialize tRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    console.log("[v0] tRPC error formatter called:", error.message)
    console.log("[v0] Error code:", error.code)
    console.log("[v0] Error cause:", error.cause)
    console.log("[v0] Error stack:", error.stack)

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause.message : null,
      },
    }
  },
})

// Create router and procedure helpers
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  console.log("[v0] Protected procedure check, user:", ctx.user ? ctx.user.id : "none")

  if (!ctx.user) {
    console.log("[v0] Unauthorized access attempt")
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})
