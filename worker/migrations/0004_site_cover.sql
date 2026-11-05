-- Existing records retain their data; NULL uses the public default cover.
ALTER TABLE sites ADD COLUMN cover_url TEXT;
