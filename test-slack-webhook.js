#!/usr/bin/env node

const testSlackWebhook = async () => {
  console.log('🧪 Testing Slack webhook...')
  
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
  
  if (!slackWebhookUrl) {
    console.error('❌ SLACK_WEBHOOK_URL not set')
    return
  }
  
  console.log(`📡 Webhook URL: ${slackWebhookUrl.substring(0, 50)}...`)
  
  const testMessage = {
    text: "🧪 Test message from cron debug",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "This is a test message to verify Slack integration works."
        }
      }
    ]
  }
  
  try {
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    })
    
    console.log(`📊 Response status: ${response.status}`)
    
    if (response.ok) {
      console.log('✅ Slack webhook test successful!')
    } else {
      const errorText = await response.text()
      console.error(`❌ Slack webhook failed: ${errorText}`)
    }
    
  } catch (error) {
    console.error('❌ Error testing Slack webhook:', error.message)
  }
}

testSlackWebhook()
