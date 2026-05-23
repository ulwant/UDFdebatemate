-- Create the audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb
);

-- Turn on Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow only 'admin' role to read audit logs
CREATE POLICY "Enable read access for admins only" ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.system_role = 'admin'
        )
    );

-- Allow 'eb' and 'admin' roles to insert audit logs
CREATE POLICY "Enable insert for eb and admin" ON audit_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.system_role IN ('admin', 'eb')
        )
    );
