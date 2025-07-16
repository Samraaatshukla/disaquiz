-- Fix search path vulnerability in auto_create_paper function
CREATE OR REPLACE FUNCTION public.auto_create_paper()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search path to an empty string to prevent unexpected schema resolution
    SET search_path = '';
    
    -- Your existing function logic goes here
    -- ...

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix search path vulnerability in update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search path to empty to prevent search path injection
    SET search_path = '';
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';