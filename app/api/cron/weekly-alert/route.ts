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

    console.log('🕐 Running weekly low stock alert for all labs...')

    const appUrl = process.env.APP_URL || "https://v0-inv-mgt.vercel.app"
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!slackWebhookUrl) {
      console.error('SLACK_WEBHOOK_URL not configured')
      return NextResponse.json({ error: 'Slack webhook not configured' }, { status: 500 })
    }

    // Get all labs
    const { data: labs, error: labsError } = await supabase
      .from('labs')
      .select('id, slug, name, config')
      .order('name')

    if (labsError || !labs || labs.length === 0) {
      console.error('Error fetching labs:', labsError)
      return NextResponse.json({ error: 'Failed to fetch labs' }, { status: 500 })
    }

    const results = []

    for (const lab of labs) {
      console.log(`📋 Checking ${lab.name}...`)

      // Get inventory for this lab
      const { data: inventory, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('lab_id', lab.id)

      if (error) {
        console.error(`Error fetching inventory for ${lab.name}:`, error)
        results.push({ lab: lab.name, error: error.message })
        continue
      }

      const defaultReorderPoint = lab.config?.alertSettings?.defaultReorderPoint || 10

      // Find low stock items
      const lowStockItems = (inventory || []).filter(item => {
        const quantity = parseInt(item.qty) || 0
        const reorderPoint = item.reorder_point || defaultReorderPoint
        return quantity <= reorderPoint
      })

      if (lowStockItems.length === 0) {
        console.log(`✅ ${lab.name}: No low stock items`)
        results.push({ lab: lab.name, itemCount: 0, sent: false })
        continue
      }

      // Format message
      const itemList = lowStockItems
        .slice(0, 10)
        .map(item => {
          const quantity = parseInt(item.qty) || 0
          const reorderPoint = item.reorder_point || defaultReorderPoint
          const status = quantity === 0 ? '🔴 OUT OF STOCK' :
                        quantity <= Math.floor(reorderPoint * 0.5) ? '🟠 CRITICALLY LOW' :
                        '🟡 LOW STOCK'
          const description = item.part_description || "No description available"
          return `• *${item.part_number}* - ${description}\n  📍 ${item.location} | 📦 Qty: ${quantity} | ⚠️ Reorder at: ${reorderPoint} | ${status}`
        })
        .join('\n\n')

      const totalItems = lowStockItems.length
      const moreItemsText = totalItems > 10 ? `\n\n_...and ${totalItems - 10} more items_` : ''

      const message = {
        text: `📊 Weekly Low Stock Alert — ${lab.name} - ${new Date().toLocaleDateString()}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `📊 Weekly Low Stock Alert — ${lab.name}`
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
              text: `🔗 <${appUrl}/${lab.slug}/low-stock|View ${lab.name} Low Stock Items>`
            }
          }
        ]
      }

      const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })

      if (!response.ok) {
        console.error(`❌ Slack error for ${lab.name}: ${response.status}`)
        results.push({ lab: lab.name, itemCount: totalItems, sent: false, error: `Slack ${response.status}` })
      } else {
        console.log(`✅ ${lab.name}: Alert sent - ${totalItems} low stock items`)
        results.push({ lab: lab.name, itemCount: totalItems, sent: true })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly alerts processed for all labs',
      results,
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
