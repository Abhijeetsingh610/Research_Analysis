# Research Paper Analysis App

A modern web application for analyzing research papers using AI, built with Next.js, tRPC, and Supabase.

## 🚀 Features

- **PDF Upload & Analysis**: Upload research papers and get AI-powered analysis
- **Intelligent Analysis**: Extract strengths, gaps, and suggestions using Google Gemini AI
- **Related Papers Search**: Find related research using Exa AI search
- **Interactive PDF Viewer**: View PDFs with resizable panels and analysis results
- **Note Management**: Add and manage notes on papers
- **Real-time Collaboration**: Built with tRPC for type-safe API communication
- **Authentication**: Secure user authentication with Supabase

## 📊 How Research Analysis Works

### Analysis Pipeline

The app uses a sophisticated AI pipeline to analyze research papers:

1. **Text Extraction**: PDF content is extracted using PDF.js
2. **Keyword Extraction**: AI identifies key terms and concepts
3. **Parallel Processing**:
   - **Gemini AI Analysis**: Analyzes paper content for strengths, gaps, and suggestions
   - **Related Papers Search**: Uses Exa AI to find similar research papers
4. **Structured Results**: Returns categorized analysis with location data

### AI Analysis Categories

- **Strengths**: Positive aspects and contributions of the research
- **Gaps**: Areas for improvement or unanswered questions
- **Suggestions**: Recommendations for future work
- **Related Papers**: Similar research with relevance scores

## 🔧 tRPC Integration

This project uses tRPC for type-safe API communication between frontend and backend.

### tRPC Architecture

```plaintext
Frontend (React/Next.js) ↔ tRPC Client ↔ tRPC Server ↔ Database (Supabase)
```

### Available tRPC Routers

#### `analysisRouter`

- `run`: Executes the complete AI analysis pipeline
- Input: `{ paperId: string, title: string, text: string }`
- Output: `{ analysis: AnalysisResult, relatedPapers: RelatedPaper[], keywords: string[] }`

#### `papersRouter`

- `getById`: Fetch paper details and analysis
- `list`: Get user's papers
- `create`: Upload new paper
- `delete`: Remove paper

#### `notesRouter`

- `list`: Get notes for a paper
- `create`: Add new note
- `delete`: Remove note

#### `authRouter`

- `signup`: User registration
- `login`: User authentication
- `logout`: Session termination

### Type Safety

tRPC ensures end-to-end type safety:

```typescript
// Client-side usage
const { data } = trpc.analysis.run.useMutation({
  paperId: "123",
  title: "Research Paper Title",
  text: "Extracted PDF content..."
});

// Server-side procedure
run: protectedProcedure
  .input(z.object({
    paperId: z.string(),
    title: z.string(),
    text: z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    // Fully typed input and return values
    return await runAnalysisPipeline(input.text, input.title);
  })
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC, Supabase (PostgreSQL)
- **AI**: Google Gemini AI, Exa AI Search
- **PDF Processing**: PDF.js, react-pdf
- **UI Components**: Radix UI, shadcn/ui
- **State Management**: TanStack Query
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account
- Google Gemini API key
- Exa AI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd research-paper-analysis-app
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create `.env.local` with:

   ```env
   # AI APIs
   GEMINI_API_KEY=your_gemini_api_key
   EXA_API_KEY=your_exa_api_key

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # Database
   POSTGRES_URL=your_postgres_connection_string
   ```

4. **Database Setup**
   Run the SQL scripts in `scripts/` directory to set up your Supabase database.

5. **Run Development Server**

   ```bash
   pnpm dev
   ```

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/trpc/          # tRPC API routes
│   ├── papers/[id]/       # Paper detail pages
│   └── dashboard/         # User dashboard
├── components/            # React components
│   ├── pdf/              # PDF viewer components
│   ├── analysis/         # Analysis display components
│   └── ui/               # Reusable UI components
├── lib/                   # Utility libraries
│   ├── ai/               # AI analysis pipeline
│   ├── trpc/             # tRPC configuration
│   └── supabase/         # Database client
└── types/                # TypeScript type definitions
```

## 🔐 Authentication Flow

1. User signs up/logs in via Supabase Auth
2. JWT tokens are managed automatically
3. Protected tRPC procedures verify user sessions
4. User data is isolated by authentication

## 📊 API Usage Examples

### Running Paper Analysis

```typescript
import { trpc } from "@/lib/trpc/client";

const analyzePaper = async (paperId: string, title: string, text: string) => {
  const result = await trpc.analysis.run.mutate({
    paperId,
    title,
    text
  });

  console.log("Analysis:", result.analysis);
  console.log("Related Papers:", result.relatedPapers);
  console.log("Keywords:", result.keywords);
};
```

### Managing Notes

```typescript
// Add a note
await trpc.notes.create.mutate({
  paperId: "123",
  noteText: "This is an important finding..."
});

// Get all notes for a paper
const notes = await trpc.notes.list.query({ paperId: "123" });
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Environment Variables**: Add all required environment variables
3. **Build Settings**: Next.js detects automatically
4. **Deploy**: Vercel handles the rest

### Environment Variables for Production

Ensure these are set in your deployment platform:

- `GEMINI_API_KEY`
- `EXA_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTGRES_URL`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [tRPC](https://trpc.io/) for type-safe APIs
- [Supabase](https://supabase.com/) for backend services
- [Google Gemini AI](https://ai.google.dev/) for paper analysis
- [Exa AI](https://exa.ai/) for research paper search
- [PDF.js](https://mozilla.github.io/pdf.js/) for PDF processing