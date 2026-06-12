-- Run this migration manually: psql $DATABASE_URL < this_file.sql
-- Or via Supabase dashboard: SQL Editor → paste contents

CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    cards_reviewed INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0
);
