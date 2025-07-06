-- Create enum for options
CREATE TYPE option_enum AS ENUM ('A', 'B', 'C', 'D');

-- Create Users/Profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    email TEXT NOT NULL,
    membership_number TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PaperMenu table
CREATE TABLE public.papers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    paper_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Questions table
CREATE TABLE public.questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question_no INTEGER NOT NULL,
    paper_name TEXT NOT NULL REFERENCES public.papers(paper_name) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option option_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(question_no, paper_name)
);

-- Create User Answers table (for tracking user responses)
CREATE TABLE public.user_answers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option option_enum,
    is_submitted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, question_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for papers (public read)
CREATE POLICY "Anyone can view papers" ON public.papers
FOR SELECT USING (true);

-- RLS Policies for questions (public read)
CREATE POLICY "Anyone can view questions" ON public.questions
FOR SELECT USING (true);

-- RLS Policies for user_answers
CREATE POLICY "Users can view their own answers" ON public.user_answers
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own answers" ON public.user_answers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers" ON public.user_answers
FOR UPDATE USING (auth.uid() = user_id);

-- Insert sample papers
INSERT INTO public.papers (paper_name) VALUES 
('Paper 1'), ('Paper 2'), ('Paper 3'), ('Paper 4'), ('Paper 5'),
('Paper 6'), ('Paper 7'), ('Paper 8'), ('Paper 9'), ('Paper 10'),
('Paper 11'), ('Paper 12'), ('Paper 13'), ('Paper 14'), ('Paper 15'),
('Paper 16'), ('Paper 17'), ('Paper 18'), ('Paper 19'), ('Paper 20'),
('Paper 21'), ('Paper 22'), ('Paper 23'), ('Paper 24'), ('Paper 25'),
('Paper 26'), ('Paper 27'), ('Paper 28'), ('Paper 29'), ('Paper 30'),
('Paper 31');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_answers_updated_at
    BEFORE UPDATE ON public.user_answers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();