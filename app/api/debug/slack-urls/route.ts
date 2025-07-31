import { NextResponse } from "next/server"

export async function GET() {
  // Only show this in development/preview - never in production for security
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

  if (isProduction) {
    return NextResponse.json(
      {
        error: "URL debug not available in production for security",
      },
      { status: 403 },
    )
  }

  // Get the raw environment variable
  const rawWebhookUrl = process.env.SLACK_WEBHOOK_URL

  // Simulate what the actual Slack functions would see
  let actualWebhookUrl: string | undefined
  try {
    // This is exactly what our Slack API routes do
    actualWebhookUrl = process.env.SLACK_WEBHOOK_URL
  } catch (error) {
    actualWebhookUrl = undefined
  }

  // Test if we can access it from different contexts
  const contexts = {
    directAccess: process.env.SLACK_WEBHOOK_URL,
    viaDestructuring: (() => {
      const { SLACK_WEBHOOK_URL } = process.env
      return SLACK_WEBHOOK_URL
    })(),
    viaSpread: (() => {
      const env = { ...process.env }
      return env.SLACK_WEBHOOK_URL
    })(),
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    webhookUrls: {
      raw: {
        exists: !!rawWebhookUrl,
        length: rawWebhookUrl?.length || 0,
        prefix: rawWebhookUrl ? rawWebhookUrl.substring(0, 40) + "..." : "Not set",
        suffix: rawWebhookUrl ? "..." + rawWebhookUrl.substring(rawWebhookUrl.length - 10) : "Not set",
        isSlackUrl: rawWebhookUrl ? rawWebhookUrl.startsWith("https://hooks.slack.com/") : false,
      },
      actual: {
        exists: !!actualWebhookUrl,
        length: actualWebhookUrl?.length || 0,
        prefix: actualWebhookUrl ? actualWebhookUrl.substring(0, 40) + "..." : "Not set",
        suffix: actualWebhookUrl ? "..." + actualWebhookUrl.substring(actualWebhookUrl.length - 10) : "Not set",
        isSlackUrl: actualWebhookUrl ? actualWebhookUrl.startsWith("https://hooks.slack.com/") : false,
      },
      match: rawWebhookUrl === actualWebhookUrl,
    },
    contexts: {
      directAccess: {
        exists: !!contexts.directAccess,
        length: contexts.directAccess?.length || 0,
        prefix: contexts.directAccess ? contexts.directAccess.substring(0, 40) + "..." : "Not set",
      },
      viaDestructuring: {
        exists: !!contexts.viaDestructuring,
        length: contexts.viaDestructuring?.length || 0,
        prefix: contexts.viaDestructuring ? contexts.viaDestructuring.substring(0, 40) + "..." : "Not set",
      },
      viaSpread: {
        exists: !!contexts.viaSpread,
        length: contexts.viaSpread?.length || 0,
        prefix: contexts.viaSpread ? contexts.viaSpread.substring(0, 40) + "..." : "Not set",
      },
      allMatch: contexts.directAccess === contexts.viaDestructuring && contexts.viaDestructuring === contexts.viaSpread,
    },
    allEnvironmentVars: {
      count: Object.keys(process.env).length,
      hasSlackWebhook: "SLACK_WEBHOOK_URL" in process.env,
      slackRelated: Object.keys(process.env)
        .filter((key) => key.toLowerCase().includes("slack"))
        .map((key) => ({
          key,
          exists: !!process.env[key],
          length: process.env[key]?.length || 0,
        })),
    },
  })
}
