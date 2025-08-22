import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    // Verify this is coming from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🕐 Running weekly low stock alert...')

    // Get inventory data
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('*')

    if (error) {
      console.error('Error fetching inventory:', error)
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
    }

    // Get alert settings
    const { data: settings } = await supabase
      .from('alert_settings')
      .select('*')
      .single()

    const defaultReorderPoint = settings?.default_reorder_point || 10

    // Find low stock items
    const lowStockItems = inventory.filter(item => {
      const quantity = parseInt(item.quantity) || 0
      const reorderPoint = item.reorder_point || defaultReorderPoint
      return quantity <= reorderPoint
    })

    if (lowStockItems.length === 0) {
      console.log('✅ No low stock items found')
      return NextResponse.json({ 
        success: true, 
        message: 'No low stock items found',
        itemCount: 0
      })
    }

    // Send Slack notification
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!slackWebhookUrl) {
      console.error('SLACK_WEBHOOK_URL not configured')
      return NextResponse.json({ error: 'Slack webhook not configured' }, { status: 500 })
    }

    // Format message
    const itemList = lowStockItems
      .slice(0, 10) // Limit to first 10 items
      .map(item => {
        const quantity = parseInt(item.quantity) || 0
        const reorderPoint = item.reorder_point || defaultReorderPoint
        const status = quantity === 0 ? '🔴 OUT OF STOCK' : 
                      quantity <= Math.floor(reorderPoint * 0.5) ? '🟠 CRITICALLY LOW' : 
                      '🟡 LOW STOCK'
        
        return `• *${item.part_number}* - ${item.description}\n  📍 ${item.location} | 📦 Qty: ${quantity} | ⚠️ Reorder at: ${reorderPoint} | ${status}`
      })
      .join('\n\n')

    const totalItems = lowStockItems.length
    const moreItemsText = totalItems > 10 ? `\n\n_...and ${totalItems - 10} more items_` : ''

    const message = {
      text: `📊 Weekly Low Stock Alert - ${new Date().toLocaleDateString()}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `📊 Weekly Low Stock Alert`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${totalItems} item${totalItems === 1 ? '' : 's'} need${totalItems === 1 ? 's' : ''} attention:*\n\n${itemList}${moreItemsText}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🔗 <https://v0-inv-mgt.vercel.app|View Full Inventory>`
          }
        }
      ]
    }

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`)
    }

    console.log(`✅ Weekly alert sent successfully - ${totalItems} low stock items`)

    return NextResponse.json({ 
      success: true, 
      message: 'Weekly alert sent successfully',
      itemCount: totalItems,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in weekly alert cron:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
