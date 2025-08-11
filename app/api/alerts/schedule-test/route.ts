import { NextRequest, NextResponse } from "next/server"
import { writeFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { time, cronMinute, cronHour } = await request.json()
    
    // Update vercel.json with the new cron schedule
    const vercelConfig = {
      "crons": [
        {
          "path": "/api/alerts/cron",
          "schedule": `${cronMinute} ${cronHour} * * *`
        }
      ]
    }
    
    // Write the updated vercel.json
    const vercelPath = join(process.cwd(), 'vercel.json')
    writeFileSync(vercelPath, JSON.stringify(vercelConfig, null, 2))
    
    return NextResponse.json({
      success: true,
      message: `Cron scheduled for ${time} Eastern Time`,
      cronSchedule: `${cronMinute} ${cronHour} * * *`,
      note: "You need to commit and push this change for it to take effect"
    })
    
  } catch (error) {
    console.error('Schedule test error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
