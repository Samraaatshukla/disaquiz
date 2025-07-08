-- Create leaderboard table to track quiz scores
CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  paper_name TEXT NOT NULL,
  score_percentage DECIMAL(5,2) NOT NULL,
  total_questions INTEGER NOT NULL,
  total_correct INTEGER NOT NULL,
  total_attempted INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policies for leaderboard access
CREATE POLICY "Anyone can view leaderboard entries" 
ON public.leaderboard 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own leaderboard entries" 
ON public.leaderboard 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance on leaderboard queries
CREATE INDEX idx_leaderboard_paper_score ON public.leaderboard(paper_name, score_percentage DESC, completed_at DESC);

-- Add foreign key reference to ensure data consistency
ALTER TABLE public.leaderboard 
ADD CONSTRAINT leaderboard_paper_name_fkey 
FOREIGN KEY (paper_name) 
REFERENCES public.papers(paper_name) 
ON DELETE CASCADE;