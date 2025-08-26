#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const checkSchema = async () => {
  console.log('🔍 Checking database schema...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Get one row to see the actual column structure
    const { data: sample, error } = await supabase
      .from('inventory')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    if (sample && sample.length > 0) {
      console.log('📋 Actual column names in database:')
      Object.keys(sample[0]).forEach(key => {
        console.log(`  "${key}": ${JSON.stringify(sample[0][key])}`)
      })
    } else {
      console.log('❌ No data found in inventory table')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkSchema()
