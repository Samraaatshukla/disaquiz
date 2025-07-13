-- Enable inserting new papers and questions for authenticated users
-- Update papers table RLS policies
DROP POLICY IF EXISTS "Anyone can view papers" ON public.papers;
CREATE POLICY "Anyone can view papers" ON public.papers FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create papers" ON public.papers 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Update questions table RLS policies  
DROP POLICY IF EXISTS "Anyone can view questions" ON public.questions;
CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create questions" ON public.questions 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Add unique constraint to papers table
DO $$ 
BEGIN
    ALTER TABLE public.papers ADD CONSTRAINT papers_paper_name_unique UNIQUE (paper_name);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create a function to auto-create papers when inserting questions
CREATE OR REPLACE FUNCTION public.auto_create_paper()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert paper if it doesn't exist
  INSERT INTO public.papers (paper_name)
  VALUES (NEW.paper_name)
  ON CONFLICT (paper_name) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create papers
DROP TRIGGER IF EXISTS auto_create_paper_trigger ON public.questions;
CREATE TRIGGER auto_create_paper_trigger
  BEFORE INSERT ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_paper();