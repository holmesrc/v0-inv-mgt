import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const payload = JSON.parse(params.get("payload") || "{}")

    if (payload.type === "block_actions") {
      const action = payload.actions[0]

      if (action.action_id === "approve_change" || action.action_id === "reject_change") {
        const { changeId, action: actionType } = JSON.parse(action.value)
        const userName = payload.user.name || payload.user.username || "Unknown User"

        // Call the approve API
        const approveResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/inventory/approve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeId,
            action: actionType,
            approvedBy: userName,
          }),
        })

        const result = await approveResponse.json()

        if (result.success) {
          // Update the Slack message
          const updatedBlocks = [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${payload.original_message.blocks[0].text.text}\n\n*Status:* ${actionType === "approve" ? "✅ APPROVED" : "❌ REJECTED"} by ${userName}`,
              },
            },
          ]

          return NextResponse.json({
            replace_original: true,
            blocks: updatedBlocks,
          })
        } else {
          return NextResponse.json({
            text: `Error: ${result.error}`,
            replace_original: false,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error handling Slack interaction:", error)
    return NextResponse.json({ text: "Error processing request" }, { status: 500 })
  }
}
