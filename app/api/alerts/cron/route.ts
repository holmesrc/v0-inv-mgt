import { NextRequest, NextResponse } from "next/server"
import { sendFullLowStockAlert } from "@/lib/slack"
import { getScheduleDescription, isCorrectAlertTime } from "@/lib/timezone"
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (Vercel cron jobs, GitHub Actions, or manual with auth)
    const authHeader = request.headers.get('authorization')
    const userAgent = request.headers.get('user-agent')
    const isVercelCron = userAgent?.includes('vercel-cron') || request.headers.get('x-vercel-cron')
    const isGitHubActions = userAgent?.includes('github-actions')
    const isDebugRequest = authHeader?.includes('debug-manual-trigger') || userAgent?.includes('debug-page-manual-test')
    
    if (!isVercelCron && !isGitHubActions && !isDebugRequest && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('❌ Unauthorized cron request')
      console.log('Auth header:', authHeader)
      console.log('User agent:', userAgent)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestSource = isGitHubActions ? 'GitHub Actions' : 
                         isVercelCron ? 'Vercel' : 
                         isDebugRequest ? 'Debug Page' : 'Manual'
    
    console.log('✅ Authorized cron request detected (source:', requestSource, ')')
    const scheduleInfo = getScheduleDescription('America/New_York')
    console.log(`🕘 Cron triggered at ${scheduleInfo.currentTime}`)

    // Skip time check for now - run every time cron triggers
    console.log(`✅ Running alert (time check disabled for testing)`)

    // Load inventory directly from Supabase using service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('📖 Loading inventory directly from database...')
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: true })

    if (inventoryError) {
      throw new Error(`Failed to load inventory: ${inventoryError.message}`)
    }

    if (!inventory || inventory.length === 0) {
      console.log('⚠️ No inventory data available for alert check')
      return NextResponse.json({ 
        success: true, 
        message: 'No inventory data available',
        timestamp: scheduleInfo.currentTime
      })
    }

    console.log(`📊 Loaded ${inventory.length} inventory items`)

    // Load alert settings (try API, fallback to defaults)
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const baseUrl = `${protocol}://${host}`
    
    let alertSettings = {
      enabled: true,
      dayOfWeek: 1, // Monday
      time: "09:00",
      defaultReorderPoint: 10
    }

    try {
      const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (settingsResponse.ok) {
        const settingsResult = await settingsResponse.json()
        if (settingsResult.success && settingsResult.settings) {
          alertSettings = { ...alertSettings, ...settingsResult.settings }
        }
      }
    } catch (settingsError) {
      console.log('⚠️ Could not load settings, using defaults:', settingsError)
    }

    // Check if alerts are enabled
    if (!alertSettings.enabled) {
      console.log('📴 Automatic alerts are disabled')
      return NextResponse.json({ 
        success: true, 
        message: 'Alerts disabled',
        timestamp: scheduleInfo.currentTime
      })
    }

    // Find low stock items
    const lowStockItems = inventory.filter((item: any) => {
      const reorderPoint = item.reorder_point || alertSettings.defaultReorderPoint
      const isLowStock = item.qty <= reorderPoint
      
      // Debug first few items
      if (inventory.indexOf(item) < 3) {
        console.log(`🔍 Item ${item.part_number}: qty=${item.qty}, reorder_point=${reorderPoint}, isLowStock=${isLowStock}`)
      }
      
      return isLowStock
    })

    console.log(`📊 Found ${lowStockItems.length} low stock items out of ${inventory.length} total`)
    console.log(`📊 Using default reorder point: ${alertSettings.defaultReorderPoint}`)
    
    // Log a few sample items for debugging
    if (lowStockItems.length > 0) {
      console.log(`📊 Sample low stock items:`, lowStockItems.slice(0, 3).map((item: any) => ({
        partNumber: item.part_number,
        qty: item.qty,
        reorderPoint: item.reorder_point || alertSettings.defaultReorderPoint
      })))
    }

    if (lowStockItems.length === 0) {
      console.log('✅ No low stock items found')
      return NextResponse.json({ 
        success: true, 
        message: 'No low stock items found',
        timestamp: scheduleInfo.currentTime,
        totalItems: inventory.length
      })
    }

    // Send Slack alert directly
    try {
      const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
      if (!slackWebhookUrl) {
        throw new Error('Slack webhook URL not configured')
      }

      const message = {
        text: `🚨 Weekly Low Stock Alert - ${lowStockItems.length} items need attention`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*🚨 Weekly Low Stock Alert*\n*Items needing attention:* ${lowStockItems.length}\n*Time:* ${scheduleInfo.currentTime}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: lowStockItems.slice(0, 5).map((item: any, index: number) => 
                `${index + 1}. *${item.part_number}* - ${item.part_description}\n   Current: ${item.qty} | Reorder: ${item.reorder_point || alertSettings.defaultReorderPoint}`
              ).join('\n\n')
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📋 <${baseUrl}/low-stock|View All ${lowStockItems.length} Low Stock Items>`
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

      console.log(`✅ Successfully sent low stock alert for ${lowStockItems.length} items`)
      
      return NextResponse.json({ 
        success: true, 
        message: `Alert sent for ${lowStockItems.length} low stock items`,
        itemsCount: lowStockItems.length,
        timestamp: scheduleInfo.currentTime,
        timezone: 'America/New_York',
        isDST: scheduleInfo.isDST,
        items: lowStockItems.map((item: any) => ({
          partNumber: item.part_number,
          description: item.part_description,
          currentQty: item.qty,
          reorderPoint: item.reorder_point || alertSettings.defaultReorderPoint
        }))
      })
    } catch (slackError) {
      console.error('❌ Failed to send Slack alert:', slackError)
      return NextResponse.json({ 
        error: 'Failed to send Slack alert',
        details: slackError instanceof Error ? slackError.message : 'Unknown error',
        timestamp: scheduleInfo.currentTime
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request)
}
