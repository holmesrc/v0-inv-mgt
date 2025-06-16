import { NextResponse } from "next/server"

export async function GET() {
  // Force deployment trigger - timestamp: 2025-06-16 17:50
  return NextResponse.json({
    message: "Deployment forced",
    timestamp: new Date().toISOString(),
    env_check: !!process.env.SLACK_WEBHOOK_URL,
  })
}
