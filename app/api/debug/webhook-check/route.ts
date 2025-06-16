import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Check all possible webhook environment variables
    const webhookUrls = {
      SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
      SLACK_WEBHOOK_URL_BACKUP: process.env.SLACK_WEBHOOK_URL_BACKUP,
      SLACK_WEBHOOK_URL_NEW: process.env.SLACK_WEBHOOK_URL_NEW,
    }

    const results: any = {
      environmentVariables: {},
      activeWebhook: null,
    }

    // Check each environment variable
    for (const [name, url] of Object.entries(webhookUrls)) {
      if (url) {
        const urlLength = url.length
        const firstPart = url.substring(0, 35)
        const lastPart = url.substring(urlLength - 10)
        const hash = url.split("/").pop()?.substring(0, 8) + "..."

        results.environmentVariables[name] = {
          exists: true,
          length: urlLength,
          firstPart,
          lastPart,
          format: url.startsWith("https://hooks.slack.com/services/"),
          hash,
        }
      } else {
        results.environmentVariables[name] = {
          exists: false,
        }
      }
    }

    // Determine which webhook is actually being used (same logic as lib/slack.ts)
    const activeUrl = process.env.SLACK_WEBHOOK_URL_NEW || process.env.SLACK_WEBHOOK_URL_BACKUP
    if (activeUrl) {
      results.activeWebhook = {
        source: activeUrl === process.env.SLACK_WEBHOOK_URL_NEW ? "SLACK_WEBHOOK_URL_NEW" : "SLACK_WEBHOOK_URL_BACKUP",
        length: activeUrl.length,
        lastPart: activeUrl.substring(activeUrl.length - 10),
        hash: activeUrl.split("/").pop()?.substring(0, 8) + "...",
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
