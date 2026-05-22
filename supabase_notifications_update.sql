-- Add insert policy for EB and Admin to send notifications on review rejection
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "EB Admin can insert notifications" ON public.notifications;
CREATE POLICY "EB Admin can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);

DROP POLICY IF EXISTS "Authenticated users can alert EB Admin" ON public.notifications;
CREATE POLICY "Authenticated users can alert EB Admin"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (SELECT system_role FROM public.profiles WHERE user_id = notifications.user_id) IN ('admin', 'eb')
);
