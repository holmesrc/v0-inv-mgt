-- Create a function to safely create the settings table if it doesn't exist
CREATE OR REPLACE FUNCTION create_settings_table()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'settings'
  ) THEN
    -- Create the settings table
    CREATE TABLE settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Disable RLS for the settings table
    ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
    
    -- Insert default settings
    INSERT INTO settings (key, value) VALUES 
    ('alert_settings', '{
      "enabled": true,
      "dayOfWeek": 1,
      "time": "09:00",
      "defaultReorderPoint": 10
    }'::jsonb);
    
    RAISE NOTICE 'Settings table created successfully';
  ELSE
    RAISE NOTICE 'Settings table already exists';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create the table if needed
SELECT create_settings_table();

-- Grant necessary permissions
-- GRANT ALL ON settings TO anon, authenticated;
