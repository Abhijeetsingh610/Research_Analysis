import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter } from "@/lib/trpc/root"
import { createTRPCContext } from "@/lib/trpc/server"

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => await createTRPCContext({ req }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? "<no-path>"}:`, error.message)
            console.error("Full error details:", {
              message: error.message,
              code: error.code,
              cause: error.cause,
              stack: error.stack,
            })
            if (error.message.includes("transform")) {
              console.error("This appears to be a serialization/transformation error")
              console.error("Check that all returned data is JSON serializable")
            }
          }
        : undefined,
    responseMeta() {
      return {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    },
  })

export { handler as GET, handler as POST }
