-- Migration: 001_make_email_and_name_nullable.sql
-- Enables username-only registration for Tone

ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN first_name DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_music_uploader_id ON public.music(uploader_id);
CREATE INDEX IF NOT EXISTS idx_music_audio_file_id ON public.music(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
