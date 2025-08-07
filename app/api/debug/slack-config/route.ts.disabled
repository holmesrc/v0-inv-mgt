import { NextResponse } from "next/server"

export async function GET() {
  // Only show this in development/preview - never in production for security
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

  if (isProduction) {
    return NextResponse.json(
      {
        error: "Slack debug not available in production for security",
      },
      { status: 403 },
    )
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    slack: {
      webhookConfigured: !!webhookUrl,
      webhookLength: webhookUrl ? webhookUrl.length : 0,
      webhookPrefix: webhookUrl ? webhookUrl.substring(0, 30) + "..." : "Not set",
      webhookValid: webhookUrl ? webhookUrl.startsWith("https://hooks.slack.com/") : false,
    },
    test: {
      canMakeRequest: true,
      timestamp: new Date().toISOString(),
    },
  })
}
