import { NextResponse } from "next/server"

export async function GET() {
  // Only show this in development/preview - never in production for security
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

  if (isProduction) {
    return NextResponse.json(
      {
        error: "Reference search not available in production for security",
      },
      { status: 403 },
    )
  }

  // Get the actual environment variable
  const envWebhookUrl = process.env.SLACK_WEBHOOK_URL

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    currentEnvVar: {
      exists: !!envWebhookUrl,
      length: envWebhookUrl?.length || 0,
      prefix: envWebhookUrl ? envWebhookUrl.substring(0, 50) + "..." : "Not set",
      suffix: envWebhookUrl ? "..." + envWebhookUrl.substring(envWebhookUrl.length - 20) : "Not set",
      fullUrl: envWebhookUrl, // Only in debug mode
    },
    codeReferences: {
      // List all the files that should be using SLACK_WEBHOOK_URL
      apiRoutes: [
        "/api/slack/send/route.ts",
        "/api/slack/post-message/route.ts",
        "/api/slack/send-full-alert/route.ts",
        "/api/slack/send-interactive-blocks/route.ts",
        "/api/slack/send-interactive/route.ts",
        "/api/slack/send-simplified/route.ts",
        "/api/slack/show-all/route.ts",
        "/api/slack/test-interaction/route.ts",
        "/api/slack/test/route.ts",
        "/api/slack/send-approval-request/route.ts",
      ],
      libraries: ["lib/slack.ts"],
      note: "These files should be using process.env.SLACK_WEBHOOK_URL",
    },
  })
}
