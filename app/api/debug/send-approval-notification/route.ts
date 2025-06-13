import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { createApprovalMessage } from "@/lib/slack"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const changeId = searchParams.get("changeId")

    if (!changeId) {
      return NextResponse.json({ success: false, error: "Change ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get the change details
    const { data: change, error: changeError } = await supabase
      .from("pending_changes")
      .select("*")
      .eq("id", changeId)
      .single()

    if (changeError || !change) {
      console.error("Error fetching change:", changeError)
      return NextResponse.json({ success: false, error: changeError?.message || "Change not found" }, { status: 404 })
    }

    // Get the app URL from environment variable or request origin
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com"
    console.log("Using app URL:", appUrl)

    // Create and send the approval message
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ success: false, error: "Slack webhook URL not configured" }, { status: 500 })
    }

    // Create the message with the correct app URL
    const message = createApprovalMessage(change, appUrl)

    // Send the message to Slack
    const slackResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    })

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text()
      console.error("Slack API error:", errorText)
      return NextResponse.json(
        { success: false, error: `Slack API error: ${slackResponse.status} ${errorText}` },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Approval notification sent successfully",
    })
  } catch (error) {
    console.error("Error in send approval notification API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
