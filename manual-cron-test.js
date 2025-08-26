#!/usr/bin/env node

const testManualCron = async () => {
  console.log('🧪 Testing cron endpoint manually...')
  
  const cronSecret = process.env.CRON_SECRET || 'test-secret'
  
  try {
    const response = await fetch('https://v0-inv-mgt.vercel.app/api/cron/weekly-alert', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'User-Agent': 'manual-test'
      }
    })
    
    console.log(`📊 Response status: ${response.status}`)
    
    const data = await response.json()
    console.log('📋 Response data:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testManualCron()
