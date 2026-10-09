-- 001 · RyannPace presets table. Already applied if you ran the original schema.sql.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.ryannpace_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    preset_name VARCHAR(100) NOT NULL DEFAULT 'RyannPace Style',
    config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ryannpace_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presets" ON public.ryannpace_presets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own presets" ON public.ryannpace_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presets" ON public.ryannpace_presets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own presets" ON public.ryannpace_presets
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER update_ryannpace_presets_updated_at
BEFORE UPDATE ON public.ryannpace_presets
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
