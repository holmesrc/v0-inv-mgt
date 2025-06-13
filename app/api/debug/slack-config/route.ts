import { NextResponse } from "next/server"
import { isSlackConfigured } from "@/lib/slack"

export async function GET() {
  try {
    const config = await isSlackConfigured()

    // Mask the webhook URL for security
    if (config.webhookUrl) {
      const maskedUrl = config.webhookUrl.substring(0, 20) + "..."
      return NextResponse.json({ configured: true, webhookUrl: maskedUrl })
    }

    return NextResponse.json({ configured: false })
  } catch (error) {
    console.error("Error checking Slack config:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
