-- 1. Add tab_url column to motions table
ALTER TABLE public.motions
ADD COLUMN IF NOT EXISTS tab_url TEXT;

-- 2. Create the bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    motion_id UUID REFERENCES public.motions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, motion_id) -- Prevent duplicate bookmarks
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for bookmarks
-- Users can read their own bookmarks
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks"
    ON public.bookmarks
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own bookmarks
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert their own bookmarks"
    ON public.bookmarks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookmarks
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks"
    ON public.bookmarks
    FOR DELETE
    USING (auth.uid() = user_id);
