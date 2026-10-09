-- 002 · RyannPace poster gallery.
-- Run this once in the Supabase SQL Editor. Safe to re-run.
--
-- Each gallery entry is a "recipe" (metrics + style + simplified route, a few KB)
-- plus a small WebP thumbnail in a PRIVATE storage bucket. Full-size PNGs are
-- never stored: posters are re-rendered from the recipe on demand, which keeps
-- the free tier (500 MB DB / 1 GB storage) comfortable.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ryannpace_posters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(120) NOT NULL,
    activity_date TIMESTAMP WITH TIME ZONE,
    aspect_ratio VARCHAR(8) NOT NULL,
    template_id VARCHAR(32) NOT NULL,
    recipe JSONB NOT NULL,
    thumbnail_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ryannpace_posters_user_created_idx
    ON public.ryannpace_posters (user_id, created_at DESC);

ALTER TABLE public.ryannpace_posters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own posters" ON public.ryannpace_posters;
CREATE POLICY "Users can view own posters" ON public.ryannpace_posters
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own posters" ON public.ryannpace_posters;
CREATE POLICY "Users can create own posters" ON public.ryannpace_posters
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own posters" ON public.ryannpace_posters;
CREATE POLICY "Users can delete own posters" ON public.ryannpace_posters
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Private thumbnail bucket: objects live at "<user_id>/<poster_id>.webp"
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('poster-thumbnails', 'poster-thumbnails', false, 524288,
        ARRAY['image/webp', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "RyannPace: read own thumbnails" ON storage.objects;
CREATE POLICY "RyannPace: read own thumbnails" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'poster-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "RyannPace: upload own thumbnails" ON storage.objects;
CREATE POLICY "RyannPace: upload own thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'poster-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "RyannPace: delete own thumbnails" ON storage.objects;
CREATE POLICY "RyannPace: delete own thumbnails" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'poster-thumbnails' AND (storage.foldername(name))[1] = auth.uid()::text);
