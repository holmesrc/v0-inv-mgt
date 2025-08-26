#!/usr/bin/env node

// Test script to verify the new cron system works correctly
// Run with: node test-new-cron.js

const testNewCron = async () => {
  console.log('🧪 Testing new cron system...')
  
  try {
    // Test the new endpoint
    const response = await fetch('http://localhost:3000/api/cron/weekly-alert', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
        'User-Agent': 'test-script'
      }
    })
    
    const data = await response.json()
    
    console.log('✅ New cron endpoint response:', {
      status: response.status,
      success: data.success,
      itemCount: data.itemCount,
      message: data.message
    })
    
    // Test the old endpoint (should return 410)
    const oldResponse = await fetch('http://localhost:3000/api/alerts/cron', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`,
        'User-Agent': 'test-script'
      }
    })
    
    const oldData = await oldResponse.json()
    
    console.log('✅ Old cron endpoint (should be disabled):', {
      status: oldResponse.status,
      deprecated: oldData.deprecated,
      newEndpoint: oldData.newEndpoint
    })
    
    if (oldResponse.status === 410) {
      console.log('✅ Old endpoint successfully disabled!')
    } else {
      console.log('⚠️ Old endpoint still active - may cause conflicts')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testNewCron()
