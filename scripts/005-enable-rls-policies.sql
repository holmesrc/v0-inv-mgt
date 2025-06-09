-- Enable RLS and create policies for inventory management tables

-- 1. Enable RLS on all tables
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_notes ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for inventory table
-- Allow service role to do everything
CREATE POLICY "Service role can manage inventory" ON public.inventory
FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read inventory
CREATE POLICY "Authenticated users can read inventory" ON public.inventory
FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Create policies for settings table
-- Allow service role to do everything
CREATE POLICY "Service role can manage settings" ON public.settings
FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read settings
CREATE POLICY "Authenticated users can read settings" ON public.settings
FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Create policies for package_notes table
-- Allow service role to do everything
CREATE POLICY "Service role can manage package_notes" ON public.package_notes
FOR ALL USING (true) WITH CHECK (true);

-- Allow authenticated users to read package notes
CREATE POLICY "Authenticated users can read package_notes" ON public.package_notes
FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Grant necessary permissions to service role
GRANT ALL ON public.inventory TO service_role;
GRANT ALL ON public.settings TO service_role;
GRANT ALL ON public.package_notes TO service_role;

-- 6. Grant read permissions to authenticated role
GRANT SELECT ON public.inventory TO authenticated;
GRANT SELECT ON public.settings TO authenticated;
GRANT SELECT ON public.package_notes TO authenticated;

-- 7. Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
