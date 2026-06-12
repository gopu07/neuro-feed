-- Run this migration manually: psql $DATABASE_URL < this_file.sql

ALTER TABLE cards ADD COLUMN IF NOT EXISTS hook_line VARCHAR(200);
ALTER TABLE cards ADD COLUMN IF NOT EXISTS why_it_matters TEXT;
