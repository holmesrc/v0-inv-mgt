#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Simple env loader
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('Could not load .env.local file');
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function keepAlive() {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    console.log(`✅ Keepalive successful at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('❌ Keepalive failed:', error.message);
  }
}

keepAlive();
