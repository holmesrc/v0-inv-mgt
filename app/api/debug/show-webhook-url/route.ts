import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // This mirrors the exact logic from lib/slack.ts - CORRECTED URL
    const WORKING_WEBHOOK_URL = "https://hooks.slack.com/services/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"

    const SLACK_WEBHOOK_URL =
      process.env.SLACK_WEBHOOK_URL_NEW || process.env.SLACK_WEBHOOK_URL_BACKUP || WORKING_WEBHOOK_URL

    const result = {
      timestamp: new Date().toISOString(),
      environmentVariables: {
        SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL ? "EXISTS" : "NOT_SET",
        SLACK_WEBHOOK_URL_NEW: process.env.SLACK_WEBHOOK_URL_NEW ? "EXISTS" : "NOT_SET",
        SLACK_WEBHOOK_URL_BACKUP: process.env.SLACK_WEBHOOK_URL_BACKUP ? "EXISTS" : "NOT_SET",
      },
      actualWebhookUsed: {
        exists: !!SLACK_WEBHOOK_URL,
        length: SLACK_WEBHOOK_URL?.length || 0,
        firstPart: SLACK_WEBHOOK_URL?.substring(0, 40) || "N/A",
        lastPart: SLACK_WEBHOOK_URL?.slice(-15) || "N/A",
        source:
          SLACK_WEBHOOK_URL === process.env.SLACK_WEBHOOK_URL_NEW
            ? "SLACK_WEBHOOK_URL_NEW"
            : SLACK_WEBHOOK_URL === process.env.SLACK_WEBHOOK_URL_BACKUP
              ? "SLACK_WEBHOOK_URL_BACKUP"
              : SLACK_WEBHOOK_URL === WORKING_WEBHOOK_URL
                ? "HARDCODED_FALLBACK"
                : "UNKNOWN",
        isWorkingWebhook: SLACK_WEBHOOK_URL === WORKING_WEBHOOK_URL,
      },
      fallbackLogic: ["1. Try SLACK_WEBHOOK_URL_NEW", "2. Try SLACK_WEBHOOK_URL_BACKUP", "3. Use HARDCODED_FALLBACK"],
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
