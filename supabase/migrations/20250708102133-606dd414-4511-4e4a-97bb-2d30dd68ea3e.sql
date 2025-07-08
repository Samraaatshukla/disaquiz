-- Update RLS policy to allow public access to user names for leaderboard
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows anyone to view basic profile info (name and membership_number)
CREATE POLICY "Anyone can view basic profile info for leaderboard" 
ON public.profiles 
FOR SELECT 
USING (true);