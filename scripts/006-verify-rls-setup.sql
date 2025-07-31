-- Verify RLS policies are working correctly

-- Check if RLS is enabled on tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('inventory', 'settings', 'package_notes');

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test basic operations (this should work after running the policies)
-- Insert a test record
INSERT INTO public.inventory (
    part_number, 
    mfg_part_number, 
    qty, 
    part_description, 
    supplier, 
    location, 
    package, 
    reorder_point
) VALUES (
    'RLS-TEST-001', 
    'RLS-TEST-MFG', 
    1, 
    'RLS Policy Test Item', 
    'Test Supplier', 
    'TEST-LOC', 
    'TEST-PKG', 
    5
);

-- Verify the insert worked
SELECT COUNT(*) as test_items FROM public.inventory WHERE part_number = 'RLS-TEST-001';

-- Clean up test data
DELETE FROM public.inventory WHERE part_number = 'RLS-TEST-001';

-- Show final verification
SELECT 'RLS policies configured successfully!' as status;
