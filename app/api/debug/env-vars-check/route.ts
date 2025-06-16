import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Check all possible Slack-related environment variables
    const envVars = {
      SLACK_WEBHOOK_URL: !!process.env.SLACK_WEBHOOK_URL,
      SLACK_WEBHOOK_URL_BACKUP: !!process.env.SLACK_WEBHOOK_URL_BACKUP,
      SLACK_WEBHOOK_URL_NEW: !!process.env.SLACK_WEBHOOK_URL_NEW,
      // Also check some other env vars to confirm the deployment is working
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    }

    // Show which Slack webhook would be used
    let activeWebhook = null
    if (process.env.SLACK_WEBHOOK_URL_NEW) {
      activeWebhook = {
        source: "SLACK_WEBHOOK_URL_NEW",
        lastChars: process.env.SLACK_WEBHOOK_URL_NEW.slice(-10),
      }
    } else if (process.env.SLACK_WEBHOOK_URL_BACKUP) {
      activeWebhook = {
        source: "SLACK_WEBHOOK_URL_BACKUP",
        lastChars: process.env.SLACK_WEBHOOK_URL_BACKUP.slice(-10),
      }
    } else if (process.env.SLACK_WEBHOOK_URL) {
      activeWebhook = {
        source: "SLACK_WEBHOOK_URL",
        lastChars: process.env.SLACK_WEBHOOK_URL.slice(-10),
      }
    }

    return NextResponse.json({
      environmentVariables: envVars,
      activeWebhook,
      deploymentTime: new Date().toISOString(),
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
