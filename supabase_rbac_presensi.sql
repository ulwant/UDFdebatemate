    -- 1. Add system_role to profiles
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS system_role TEXT DEFAULT 'member';

    -- Create policy to allow users to update their own profile or if they are EB/Admin
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile"
        ON public.profiles
        FOR UPDATE
        USING (
            auth.uid() = user_id OR 
            (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
        );

    -- Update motions table RLS
    ALTER TABLE public.motions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read access" ON public.motions;
    CREATE POLICY "Allow read access"
        ON public.motions FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow insert for auth users" ON public.motions;
    CREATE POLICY "Allow insert for eb and admin"
        ON public.motions FOR INSERT 
        WITH CHECK (
            (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
        );

    -- 2. Create Attendance Tables
    CREATE TABLE IF NOT EXISTS public.attendance_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        secret_token UUID DEFAULT gen_random_uuid() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_by UUID REFERENCES auth.users(id) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.attendance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        status TEXT DEFAULT 'Present',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(session_id, user_id) -- Prevent duplicate attendance per session
    );

    -- 3. Enable RLS for Attendance
    ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

    -- Sessions: Everyone can read (to verify token). Only EB/Admin can insert.
    CREATE POLICY "Anyone can read sessions" ON public.attendance_sessions FOR SELECT USING (true);
    CREATE POLICY "EB Admin can create sessions" ON public.attendance_sessions FOR INSERT 
        WITH CHECK ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'));

    -- Records: EB/Admin can read all. Users can read their own.
    CREATE POLICY "EB Admin can read all records" ON public.attendance_records FOR SELECT
        USING ((SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb'));
    CREATE POLICY "Users can read own records" ON public.attendance_records FOR SELECT
        USING (auth.uid() = user_id);
        
    -- Users can insert their own attendance
    CREATE POLICY "Users can insert own attendance" ON public.attendance_records FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    -- Optional: To quickly test, you can run this after signing up to make a specific user an admin:
    -- UPDATE public.profiles SET system_role = 'admin' WHERE name = 'Your Name';
