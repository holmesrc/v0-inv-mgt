import { NextRequest, NextResponse } from "next/server"
import { sendFullLowStockAlert } from "@/lib/slack"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Manual alert test triggered')

    // Load inventory directly from database using service key
    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("*")
      .order("part_number")

    if (inventoryError) {
      console.error("❌ Error loading inventory:", inventoryError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to load inventory from database',
        details: inventoryError.message
      }, { status: 500 })
    }

    if (!inventoryData || inventoryData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No inventory data found' 
      }, { status: 400 })
    }

    // Transform data to expected format
    const inventory = inventoryData.map((item) => ({
      id: item.id,
      "Part number": item.part_number,
      "MFG Part number": item.mfg_part_number,
      QTY: item.qty,
      "Part description": item.part_description,
      Location: item.location,
      Supplier: item.supplier,
      Package: item.package,
      reorderPoint: item.reorder_point
    }))

    console.log(`📊 Loaded ${inventory.length} inventory items`)

    // Find low stock items (using default reorder point of 10)
    const lowStockItems = inventory.filter((item: any) => {
      const reorderPoint = item.reorderPoint || 10
      return item.QTY <= reorderPoint
    })

    console.log(`📊 Found ${lowStockItems.length} low stock items`)

    if (lowStockItems.length === 0) {
      // Send a test message anyway
      const testMessage = {
        text: "🧪 Manual Test Alert - No Low Stock Items Found",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🧪 Manual Test Alert*\n*Status:* No low stock items found\n*Total Items:* ${inventory.length}\n*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`
            }
          }
        ]
      }

      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
      if (slackWebhookUrl) {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testMessage)
        })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Test alert sent - no low stock items found',
        totalItems: inventory.length
      })
    }

    // Send actual low stock alert directly to Slack
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!slackWebhookUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Slack webhook URL not configured' 
      }, { status: 500 })
    }

    const message = {
      text: `🚨 Low Stock Alert - ${lowStockItems.length} items need attention`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🚨 Low Stock Alert*\n*Items needing attention:* ${lowStockItems.length}\n*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: lowStockItems.slice(0, 5).map((item: any, index: number) => 
              `${index + 1}. *${item["Part number"]}* - ${item["Part description"]}\n   Current: ${item.QTY} | Reorder: ${item.reorderPoint || 10}`
            ).join('\n\n')
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📋 <https://v0-inv-k3e82hxmi-holmesrc-amazoncoms-projects.vercel.app/low-stock|View All ${lowStockItems.length} Low Stock Items>`
          }
        }
      ]
    }

    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })

    if (!slackResponse.ok) {
      throw new Error(`Slack webhook failed: ${slackResponse.status}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Low stock alert sent for ${lowStockItems.length} items`,
      itemsCount: lowStockItems.length,
      items: lowStockItems.map((item: any) => ({
        partNumber: item["Part number"],
        description: item["Part description"],
        currentQty: item.QTY,
        reorderPoint: item.reorderPoint || 10
      }))
    })

  } catch (error) {
    console.error('❌ Manual test error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
