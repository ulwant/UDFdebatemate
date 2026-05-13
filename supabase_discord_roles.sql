-- Discord/member role catalog.
-- EB/Admin can create roles; everyone can read available roles.

CREATE TABLE IF NOT EXISTS public.discord_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#175b45',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.discord_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read discord roles" ON public.discord_roles;
CREATE POLICY "Anyone can read discord roles"
ON public.discord_roles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "EB Admin can manage discord roles" ON public.discord_roles;
DROP POLICY IF EXISTS "EB Admin can create discord roles" ON public.discord_roles;
CREATE POLICY "EB Admin can manage discord roles"
ON public.discord_roles FOR ALL
USING (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
)
WITH CHECK (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

INSERT INTO public.discord_roles (name, color)
VALUES
  ('Novice', '#a3be8c'),
  ('Open', '#b48ead'),
  ('Newbie', '#8fbcbb'),
  ('UDF24', '#81a1c1'),
  ('UDF25', '#5e81ac'),
  ('Varsity', '#d08770'),
  ('Coach', '#ebcb8b'),
  ('EB', '#bf616a'),
  ('Admin', '#d08770')
ON CONFLICT (name) DO NOTHING;
