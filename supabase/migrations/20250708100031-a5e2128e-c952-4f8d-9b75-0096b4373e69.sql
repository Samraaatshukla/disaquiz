-- Add foreign key relationship between leaderboard and profiles
ALTER TABLE public.leaderboard 
ADD CONSTRAINT leaderboard_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;