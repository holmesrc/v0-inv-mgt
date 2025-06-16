import { NextResponse } from "next/server"

export async function GET() {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL

    // Check if the webhook URL is set
    if (!webhookUrl) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: "SLACK_WEBHOOK_URL environment variable is not set",
        envVars: {
          hasSlackWebhook: !!process.env.SLACK_WEBHOOK_URL,
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
        },
      })
    }

    // Try to make a simple HEAD request to verify the URL is valid
    // This won't send a message but will check if the URL is accessible
    try {
      const response = await fetch(webhookUrl, {
        method: "HEAD",
        headers: {
          "Content-Type": "application/json",
        },
      })

      return NextResponse.json({
        success: true,
        configured: true,
        urlValid: response.ok,
        status: response.status,
        statusText: response.statusText,
        webhookUrlLength: webhookUrl.length,
        webhookUrlStart: webhookUrl.substring(0, 10) + "...",
      })
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        configured: true,
        urlValid: false,
        error: fetchError instanceof Error ? fetchError.message : "Unknown fetch error",
        webhookUrlLength: webhookUrl.length,
        webhookUrlStart: webhookUrl.substring(0, 10) + "...",
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
