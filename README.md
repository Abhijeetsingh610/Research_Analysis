# Paper Analysis App

A modern web application for analyzing research papers using AI, built with Next.js, tRPC, and Supabase.

## 🚀 Features

- **PDF Upload & Analysis**: Upload research papers and get AI-powered analysis
- **Interactive PDF Highlighting**: Advanced PDF viewer with text selection and highlighting capabilities
- **Intelligent Analysis**: Extract strengths, gaps, and suggestions using Google Gemini AI
- **Related Papers Search**: Find related research using Exa AI search
- **Interactive PDF Viewer**: View PDFs with resizable panels and analysis results
- **Note Management**: Add and manage notes on papers
- **Real-time Communication**: Built with tRPC for type-safe API communication
- **Authentication**: Secure user authentication with Supabase

## 📊 How Research Analysis Works

### Analysis Pipeline

The app uses a sophisticated AI pipeline to analyze research papers:

1. **Text Extraction**: PDF content is extracted using PDF.js and custom text extractors
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

- **Frontend**: Next.js 15.2.4, React 19, TypeScript, Tailwind CSS 4.1.9
- **Backend**: tRPC, Supabase (PostgreSQL)
- **AI**: Google Gemini AI (@google/generative-ai), Exa AI Search
- **PDF Processing**: PDF.js (pdfjs-dist), react-pdf, react-pdf-highlighter
- **UI Components**: Radix UI, shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS with animations
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm (pnpm recommended)
- Supabase account
- Google Gemini API key
- Exa AI API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd research-analysis
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
   Run the SQL scripts in the `scripts/` directory to set up your Supabase database:
   - `001_create_database_schema.sql`
   - `002_create_user_trigger.sql`
   - `003_create_storage_bucket.sql`
   - `004_update_storage_policies.sql`
   - `005_fix_storage_permissions.sql`

5. **Run Development Server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
├── app/               # Next.js App Router pages and API routes
│   ├── api/            # Edge and serverless handlers
│   ├── auth/           # Authentication flows
│   ├── dashboard/      # Authenticated dashboard
│   ├── papers/         # Paper detail routes
│   ├── upload/         # PDF upload workflow
│   ├── globals.css     # Global styles applied to the app
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Landing page
├── components/         # Reusable React components
│   ├── analysis/       # Analysis pipeline UI
│   ├── auth/           # Authentication UI
│   ├── dashboard/      # Dashboard widgets
│   ├── pdf/            # PDF viewer and helpers
│   ├── ui/             # Design system primitives
│   ├── upload/         # Upload components
│   └── theme-provider.tsx
├── lib/                # Domain and infrastructure logic
│   ├── ai/             # AI integration helpers
│   ├── supabase/       # Supabase server/client utilities
│   ├── trpc/           # tRPC router setup
│   ├── utils/          # Miscellaneous utilities
│   ├── types.ts
│   └── utils.ts
├── public/             # Static assets
├── styles/             # Additional styling helpers
│   └── globals.css
├── middleware.ts       # Next.js middleware
├── next.config.mjs     # Next.js configuration
├── postcss.config.mjs  # PostCSS/Tailwind configuration
├── package.json
└── tsconfig.json
```

## 🔐 Authentication Flow

1. User signs up/logs in via Supabase Auth
2. JWT tokens are managed automatically by Supabase
3. Protected tRPC procedures verify user sessions
4. User data is isolated by authentication
5. Middleware handles route protection

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
2. **Environment Variables**: Add all required environment variables in Vercel dashboard
3. **Build Settings**:

   - Framework Preset: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
4. **Deploy**: Vercel handles automatic deployments on git push

### Environment Variables for Production

Ensure these are set in your deployment platform:

```bash
GEMINI_API_KEY=your_production_gemini_key
EXA_API_KEY=your_production_exa_key
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
POSTGRES_URL=your_production_postgres_url
```

### Build Configuration

The project includes optimized build settings:

- **Next.js 15** with App Router
- **Static optimization** for faster loading
- **Bundle analysis** for size optimization
- **TypeScript** strict mode enabled

## 🧪 Testing

Testing commands have not been configured in this repository yet. If you add a testing framework (e.g., Vitest, Playwright, or Cypress), update this section with the relevant commands.

## 🔧 Development

### Available Scripts

```bash
pnpm dev    # Start development server
pnpm build  # Build for production
pnpm start  # Start production server
pnpm lint   # Run ESLint
```

> **Note:** A dedicated `type-check` script is not configured. Run `pnpm lint` or `pnpm tsc --noEmit` manually if needed.

### Code Quality

- **TypeScript**: Strict mode enabled via `tsconfig.json`
- **ESLint**: Configured with Next.js and React best practices
- **Prettier**: Add your preferred configuration if you want automatic formatting

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style and patterns
4. **Run the formatter/linter**: `pnpm lint`
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Submit a pull request**: Describe your changes and link any related issues

### Development Guidelines

- Follow TypeScript best practices already configured in the project
- Use meaningful commit messages
- Add documentation for new features where relevant
- Include tests if a testing framework is added in the future

## 📄 License

A license file has not been added yet. Choose a license (for example, MIT) and add it to `LICENSE` if you plan to make the project public.

## 🙏 Acknowledgments

- [**Next.js**](https://nextjs.org/) - The React framework for production
- [**tRPC**](https://trpc.io/) - End-to-end typesafe APIs
- [**Supabase**](https://supabase.com/) - Open source Firebase alternative
- [**Google Gemini AI**](https://ai.google.dev/) - Advanced AI for paper analysis
- [**Exa AI**](https://exa.ai/) - AI-powered search for research papers
- [**PDF.js**](https://mozilla.github.io/pdf.js/) - PDF processing in the browser
- [**React PDF**](https://react-pdf.org/) - React PDF viewer components
- [**Radix UI**](https://www.radix-ui.com/) - Low-level UI primitives
- [**Tailwind CSS**](https://tailwindcss.com/) - Utility-first CSS framework
- [**shadcn/ui**](https://ui.shadcn.com/) - Re-usable components built with Radix UI

## 🐛 Known Issues

Check the [issues page](../../issues) for current known issues and feature requests.

## 📞 Support

If you have questions or need help:

1. Check the [documentation](./docs/)
2. Search [existing issues](../../issues)
3. Create a [new issue](../../issues/new) if needed

---

Built with ❤️ using Next.js, tRPC, and Supabase