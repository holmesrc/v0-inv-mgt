import { NextRequest, NextResponse } from "next/server"
import { sendFullLowStockAlert } from "@/lib/slack"

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Manual alert test triggered')

    // Construct base URL
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    // Load current inventory
    const inventoryResponse = await fetch(`${baseUrl}/api/inventory`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    })

    if (!inventoryResponse.ok) {
      throw new Error(`Failed to load inventory: ${inventoryResponse.status}`)
    }

    const inventoryResult = await inventoryResponse.json()
    
    if (!inventoryResult.success || !inventoryResult.data) {
      return NextResponse.json({ 
        success: false, 
        error: 'No inventory data available',
        details: inventoryResult
      }, { status: 400 })
    }

    const inventory = inventoryResult.data

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

    // Send actual low stock alert
    await sendFullLowStockAlert(lowStockItems, "#inventory-alerts")
    
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
