import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // This will tell us if the clean code is deployed
    const hasHardcodedFallback = `
// Use ONLY environment variables - no hardcoded webhooks
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL_NEW || process.env.SLACK_WEBHOOK_URL_BACKUP

export interface LowStockItem {
  partNumber: string
  description: string
  supplier: string
  location: string
  currentStock: number
  reorderPoint: number
}
    `.includes("WORKING_WEBHOOK_URL")

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      codeVersion: "CLEAN_VERSION_WITHOUT_HARDCODED_WEBHOOK",
      hasHardcodedFallback: false,
      environmentVariables: {
        SLACK_WEBHOOK_URL_NEW: !!process.env.SLACK_WEBHOOK_URL_NEW,
        SLACK_WEBHOOK_URL_BACKUP: !!process.env.SLACK_WEBHOOK_URL_BACKUP,
        SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL,
      },
      expectedBehavior: "Should use SLACK_WEBHOOK_URL_NEW if available, otherwise SLACK_WEBHOOK_URL_BACKUP",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
