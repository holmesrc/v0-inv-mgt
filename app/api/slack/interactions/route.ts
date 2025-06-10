import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("🔔 Slack interaction received")

  try {
    const body = await request.text()
    console.log("📥 Raw body:", body.substring(0, 200) + "...")

    // Parse the form data
    const params = new URLSearchParams(body)
    const payloadString = params.get("payload")

    if (!payloadString) {
      console.log("❌ No payload found")
      return NextResponse.json({ text: "No payload received" }, { status: 400 })
    }

    const payload = JSON.parse(payloadString)
    console.log("📋 Parsed payload type:", payload.type)
    console.log("📋 Payload actions:", payload.actions)

    if (payload.type === "block_actions" && payload.actions && payload.actions.length > 0) {
      const action = payload.actions[0]
      console.log("🎯 Action received:", action.action_id, "Value:", action.value)

      if (action.action_id === "approve_change" || action.action_id === "reject_change") {
        try {
          const actionData = JSON.parse(action.value)
          const userName = payload.user.name || payload.user.username || "Unknown User"

          console.log("👤 User:", userName)
          console.log("📊 Action data:", actionData)

          // Call the approve API
          const approveResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/inventory/approve`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              changeId: actionData.changeId,
              action: actionData.action,
              approvedBy: userName,
            }),
          })

          const result = await approveResponse.json()
          console.log("📝 Approval result:", result)

          if (result.success) {
            // Update the Slack message
            const statusText = actionData.action === "approve" ? "✅ APPROVED" : "❌ REJECTED"
            const updatedBlocks = [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `${payload.original_message.blocks[0].text.text}\n\n*Status:* ${statusText} by ${userName}`,
                },
              },
            ]

            return NextResponse.json({
              replace_original: true,
              blocks: updatedBlocks,
            })
          } else {
            return NextResponse.json({
              text: `❌ Error: ${result.error}`,
              replace_original: false,
            })
          }
        } catch (parseError) {
          console.error("❌ Error parsing action value:", parseError)
          return NextResponse.json({
            text: "❌ Error processing action",
            replace_original: false,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Error handling Slack interaction:", error)
    return NextResponse.json({ text: "❌ Error processing request" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Slack interactions endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
