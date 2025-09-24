import { createTRPCRouter } from "./server"
import { authRouter } from "./routers/auth"
import { papersRouter } from "./routers/papers"
import { analysisRouter } from "./routers/analysis"
import { notesRouter } from "./routers/notes"

export const appRouter = createTRPCRouter({
  auth: authRouter,
  papers: papersRouter,
  analysis: analysisRouter,
  notes: notesRouter,
})

export type AppRouter = typeof appRouter
