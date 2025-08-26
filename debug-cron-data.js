#!/usr/bin/env node

// Debug script to check what data the cron job is actually seeing
// Run with: node debug-cron-data.js

const { createClient } = require('@supabase/supabase-js')

const debugCronData = async () => {
  console.log('🔍 Debugging cron job data...')
  
  // Use the same environment variables as the cron job
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    console.log('Set these environment variables:')
    console.log('export NEXT_PUBLIC_SUPABASE_URL="your_url"')
    console.log('export SUPABASE_SERVICE_ROLE_KEY="your_key"')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Get inventory data exactly like the cron job does
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('*')

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log(`📊 Total items retrieved: ${inventory.length}`)
    
    // Check first 3 items to see the actual data structure
    console.log('\n🔍 Sample data (first 3 items):')
    inventory.slice(0, 3).forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`)
      console.log(`  Part number: "${item["Part number"]}"`)
      console.log(`  QTY raw: ${JSON.stringify(item.QTY)} (type: ${typeof item.QTY})`)
      console.log(`  parseInt(QTY): ${parseInt(item.QTY)}`)
      console.log(`  parseInt(QTY) || 0: ${parseInt(item.QTY) || 0}`)
      console.log(`  Part description: "${item["Part description"]}"`)
      console.log(`  Location: "${item.Location}"`)
      console.log(`  reorder_point: ${item.reorder_point}`)
    })

    // Check QTY field distribution
    const qtyTypes = {}
    const qtyValues = {}
    
    inventory.forEach(item => {
      const qtyType = typeof item.QTY
      qtyTypes[qtyType] = (qtyTypes[qtyType] || 0) + 1
      
      const qtyValue = item.QTY
      if (qtyValue !== null && qtyValue !== undefined) {
        qtyValues[qtyValue] = (qtyValues[qtyValue] || 0) + 1
      }
    })

    console.log('\n📈 QTY field type distribution:')
    Object.entries(qtyTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} items`)
    })

    console.log('\n📈 QTY value distribution (top 10):')
    Object.entries(qtyValues)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([value, count]) => {
        console.log(`  "${value}": ${count} items`)
      })

    // Test the cron job logic
    const { data: settings } = await supabase
      .from('alert_settings')
      .select('*')
      .single()

    const defaultReorderPoint = settings?.default_reorder_point || 10
    console.log(`\n⚙️ Default reorder point: ${defaultReorderPoint}`)

    const lowStockItems = inventory.filter(item => {
      const quantity = parseInt(item.QTY) || 0
      const reorderPoint = item.reorder_point || defaultReorderPoint
      return quantity <= reorderPoint
    })

    console.log(`\n🚨 Low stock items found: ${lowStockItems.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugCronData()
