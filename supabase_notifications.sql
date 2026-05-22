CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    type TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'normal',
    action_required BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "EB Admin can insert notifications" ON notifications FOR INSERT WITH CHECK (
  (SELECT system_role FROM public.profiles WHERE user_id = auth.uid()) IN ('admin', 'eb')
);
CREATE POLICY "Authenticated users can alert EB Admin" ON notifications FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND (SELECT system_role FROM public.profiles WHERE user_id = notifications.user_id) IN ('admin', 'eb')
);
