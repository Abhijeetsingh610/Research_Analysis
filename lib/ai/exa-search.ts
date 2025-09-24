interface ExaSearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
  author?: string
}

export interface RelatedPaper {
  title: string
  url: string
  snippet: string
  relevanceScore: number
  publishedDate?: string
  author?: string
}

export async function searchRelatedPapers(paperTitle: string, keywords: string[], limit = 10): Promise<RelatedPaper[]> {
  if (!process.env.EXA_API_KEY) {
    console.warn("EXA_API_KEY not found, returning mock data")
    return getMockRelatedPapers(paperTitle)
  }

  try {
    const searchQuery = `${paperTitle} ${keywords.join(" ")} research paper academic`

    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXA_API_KEY}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        type: "neural",
        useAutoprompt: true,
        numResults: limit,
        contents: {
          text: true,
          highlights: true,
        },
        category: "research paper",
        startPublishedDate: "2020-01-01", // Focus on recent papers
      }),
    })

    if (!response.ok) {
      throw new Error(`Exa API error: ${response.statusText}`)
    }

    const data = await response.json()
    const results: ExaSearchResult[] = data.results || []

    return results.map((result, index) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet || "",
      relevanceScore: Math.max(0.1, 1 - index * 0.1), // Simple relevance scoring
      publishedDate: result.publishedDate,
      author: result.author,
    }))
  } catch (error) {
    console.error("Exa search error:", error)
    return getMockRelatedPapers(paperTitle)
  }
}

function getMockRelatedPapers(paperTitle: string): RelatedPaper[] {
  return [
    {
      title: `Recent Advances in ${paperTitle.split(" ").slice(0, 3).join(" ")} Research`,
      url: "https://example.com/paper1",
      snippet: "This paper presents novel approaches and methodologies that build upon existing research...",
      relevanceScore: 0.9,
      publishedDate: "2024-01-15",
      author: "Smith et al.",
    },
    {
      title: `A Comprehensive Review of ${paperTitle.split(" ").slice(0, 2).join(" ")} Methods`,
      url: "https://example.com/paper2",
      snippet: "We provide a systematic review of current methodologies and identify key research gaps...",
      relevanceScore: 0.8,
      publishedDate: "2023-11-20",
      author: "Johnson & Lee",
    },
    {
      title: `Future Directions in ${paperTitle.split(" ").slice(0, 3).join(" ")} Studies`,
      url: "https://example.com/paper3",
      snippet: "This work outlines promising research directions and potential applications...",
      relevanceScore: 0.7,
      publishedDate: "2024-03-10",
      author: "Davis et al.",
    },
  ]
}

export function extractKeywords(paperText: string, title: string): string[] {
  // Simple keyword extraction - in production, use more sophisticated NLP
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
  ])

  const words = (title + " " + paperText.slice(0, 2000))
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.has(word))

  const wordFreq = new Map<string, number>()
  words.forEach((word) => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
  })

  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word)
}
