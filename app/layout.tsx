import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { TRPCProvider } from "@/lib/trpc/provider"
import { AuthProvider } from "@/components/auth/auth-provider"

export const metadata: Metadata = {
  title: "Paper Analysis App",
  description: "AI-powered research paper analysis and highlighting",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
