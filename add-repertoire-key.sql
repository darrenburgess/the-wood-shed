-- Add key column to repertoire table

ALTER TABLE repertoire
ADD COLUMN IF NOT EXISTS key VARCHAR(50);
