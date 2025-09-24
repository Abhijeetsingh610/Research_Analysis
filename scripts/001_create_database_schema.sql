-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (auth.uid() = id);

-- Create papers table
CREATE TABLE IF NOT EXISTS public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  title TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on papers table
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- RLS policies for papers table
CREATE POLICY "papers_select_own" ON public.papers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "papers_insert_own" ON public.papers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "papers_update_own" ON public.papers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "papers_delete_own" ON public.papers FOR DELETE USING (auth.uid() = user_id);

-- Create analysis table
CREATE TABLE IF NOT EXISTS public.analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  strengths JSONB,
  gaps JSONB,
  suggestions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on analysis table
ALTER TABLE public.analysis ENABLE ROW LEVEL SECURITY;

-- RLS policies for analysis table (users can access analysis for their papers)
CREATE POLICY "analysis_select_own" ON public.analysis FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.papers 
    WHERE papers.id = analysis.paper_id AND papers.user_id = auth.uid()
  ));
CREATE POLICY "analysis_insert_own" ON public.analysis FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.papers 
    WHERE papers.id = analysis.paper_id AND papers.user_id = auth.uid()
  ));
CREATE POLICY "analysis_update_own" ON public.analysis FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.papers 
    WHERE papers.id = analysis.paper_id AND papers.user_id = auth.uid()
  ));
CREATE POLICY "analysis_delete_own" ON public.analysis FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.papers 
    WHERE papers.id = analysis.paper_id AND papers.user_id = auth.uid()
  ));

-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  highlight_location JSONB NOT NULL, -- {page: number, textSpan: {start: number, end: number}}
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for notes table
CREATE POLICY "notes_select_own" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_own" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON public.notes FOR DELETE USING (auth.uid() = user_id);
