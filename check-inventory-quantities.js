#!/usr/bin/env node

// Quick script to check inventory quantity distribution
// Run with: node check-inventory-quantities.js

const { createClient } = require('@supabase/supabase-js')

const checkQuantities = async () => {
  console.log('🔍 Checking inventory quantities...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('QTY, "Part number", "Part description"')
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`📊 Total items: ${inventory.length}`)
    
    // Quantity distribution
    const quantities = inventory.map(item => parseInt(item.QTY) || 0)
    const zeroQty = quantities.filter(q => q === 0).length
    const lowQty = quantities.filter(q => q > 0 && q <= 10).length
    const goodQty = quantities.filter(q => q > 10).length
    
    console.log('\n📈 Quantity Distribution:')
    console.log(`  Zero stock (0): ${zeroQty} items`)
    console.log(`  Low stock (1-10): ${lowQty} items`) 
    console.log(`  Good stock (>10): ${goodQty} items`)
    
    // Description status
    const withDesc = inventory.filter(item => item["Part description"] && item["Part description"].trim() !== '').length
    const withoutDesc = inventory.length - withDesc
    
    console.log('\n📝 Description Status:')
    console.log(`  With descriptions: ${withDesc} items`)
    console.log(`  Missing descriptions: ${withoutDesc} items`)
    
    // Sample of items with 0 quantity
    console.log('\n🔍 Sample zero-stock items:')
    inventory.filter(item => parseInt(item.QTY) === 0)
      .slice(0, 5)
      .forEach(item => {
        console.log(`  ${item["Part number"]} - "${item["Part description"] || 'undefined'}"`)
      })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkQuantities()
