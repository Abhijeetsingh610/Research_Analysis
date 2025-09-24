"use client"

import React from "react"
import { useHighlightContainerContext } from "react-pdf-highlighter-extended"
import type { Highlight } from "react-pdf-highlighter-extended/dist/esm/types"

interface CustomHighlight extends Highlight {
  comment?: { text: string }
  color?: string
}

export const HighlightContainer = () => {
  const {
    highlight,
    viewportToScaled,
    screenshot,
    isScrolledTo,
    highlightBindings,
  } = useHighlightContainerContext<CustomHighlight>()

  // Determine if this is a text highlight or area highlight
  const isTextHighlight = !Boolean(
    highlight.content && highlight.content.image
  )

  // Handle click on highlight
  const handleHighlightClick = () => {
    // For now, we'll just log the click - in a real implementation you might show a popup
    console.log("Highlight clicked:", highlight)
  }

  // Render text highlight
  if (isTextHighlight) {
    return (
      <div
        className={`rounded-[2px] opacity-100 transition-all duration-200 ${
          isScrolledTo ? "bg-yellow-200 ring-2 ring-yellow-400" : ""
        }`}
        style={{
          backgroundColor: highlight.color || "rgba(255, 255, 0, 0.5)",
          cursor: "pointer",
          padding: "2px 0",
        }}
        onClick={handleHighlightClick}
      >
        <div className="w-full h-full" />
      </div>
    )
  }

  // Render area highlight
  return (
    <div
      className="rounded opacity-70 border border-dashed border-gray-400"
      style={{
        backgroundColor: highlight.color || "rgba(255, 255, 0, 0.3)",
        cursor: "pointer",
      }}
      onClick={handleHighlightClick}
    >
      <div className="w-full h-full" />
    </div>
  )
}