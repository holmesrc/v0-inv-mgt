#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const testFixedCron = async () => {
  console.log('🧪 Testing fixed cron job logic...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Get inventory data (same as cron job)
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('*')

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    // Get alert settings (same as cron job)
    const { data: settings } = await supabase
      .from('alert_settings')
      .select('*')
      .single()

    const defaultReorderPoint = settings?.default_reorder_point || 10

    // Find low stock items (FIXED logic)
    const lowStockItems = inventory.filter(item => {
      const quantity = parseInt(item.qty) || 0
      const reorderPoint = item.reorder_point || defaultReorderPoint
      return quantity <= reorderPoint
    })

    console.log(`📊 Total items: ${inventory.length}`)
    console.log(`🚨 Low stock items: ${lowStockItems.length}`)
    console.log(`⚙️ Default reorder point: ${defaultReorderPoint}`)

    if (lowStockItems.length === 0) {
      console.log('✅ No low stock items - no Slack message would be sent')
      return
    }

    console.log('\n📋 Low stock items (first 5):')
    lowStockItems.slice(0, 5).forEach(item => {
      const quantity = parseInt(item.qty) || 0
      const reorderPoint = item.reorder_point || defaultReorderPoint
      console.log(`  ${item.part_number} - Qty: ${quantity}, Reorder: ${reorderPoint}`)
    })

    console.log('\n✅ Slack message WOULD be sent with this data')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testFixedCron()
