-- Create login_attempts table to track failed login attempts
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies - only allow system access (no user access needed)
CREATE POLICY "System can manage login attempts"
ON public.login_attempts
FOR ALL
TO service_role
USING (true);

-- Create unique index on email for efficient lookups
CREATE UNIQUE INDEX idx_login_attempts_email ON public.login_attempts(email);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_login_attempts_updated_at
BEFORE UPDATE ON public.login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  attempt_record RECORD;
BEGIN
  SELECT * INTO attempt_record
  FROM public.login_attempts
  WHERE email = user_email;
  
  -- If no record exists, user is not blocked
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is currently blocked
  IF attempt_record.blocked_until IS NOT NULL AND attempt_record.blocked_until > now() THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(user_email TEXT, is_successful BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_attempts INTEGER := 0;
  max_attempts INTEGER := 5;
BEGIN
  -- Get current attempt count
  SELECT failed_attempts INTO current_attempts
  FROM public.login_attempts
  WHERE email = user_email;
  
  IF is_successful THEN
    -- Reset failed attempts on successful login
    INSERT INTO public.login_attempts (email, failed_attempts, last_attempt_at, blocked_until)
    VALUES (user_email, 0, now(), NULL)
    ON CONFLICT (email) 
    DO UPDATE SET 
      failed_attempts = 0,
      last_attempt_at = now(),
      blocked_until = NULL,
      updated_at = now();
  ELSE
    -- Increment failed attempts
    current_attempts := COALESCE(current_attempts, 0) + 1;
    
    INSERT INTO public.login_attempts (email, failed_attempts, last_attempt_at, blocked_until)
    VALUES (
      user_email, 
      current_attempts, 
      now(), 
      CASE 
        WHEN current_attempts >= max_attempts THEN now() + INTERVAL '24 hours'
        ELSE NULL
      END
    )
    ON CONFLICT (email) 
    DO UPDATE SET 
      failed_attempts = current_attempts,
      last_attempt_at = now(),
      blocked_until = CASE 
        WHEN current_attempts >= max_attempts THEN now() + INTERVAL '24 hours'
        ELSE NULL
      END,
      updated_at = now();
  END IF;
END;
$$;