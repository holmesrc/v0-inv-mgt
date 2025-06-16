// Updated Slack webhook integration with new URL
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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"

export interface LowStockItem {
  partNumber: string
  description: string
  supplier: string
  location: string
  currentStock: number
  reorderPoint: number
}

export interface SlackResult {
  success: boolean
  error?: string
  itemCount?: number
}

// Test the Slack connection with a simple message
export async function testSlackConnection(): Promise<SlackResult> {
  try {
    const testPayload = {
      text: "✅ Slack integration test successful! Your inventory alerts are working.",
    }

    console.log("🧪 Testing Slack connection with new webhook...")

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Slack test failed:", errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    console.log("✅ Slack test successful")
    return { success: true }
  } catch (error) {
    console.error("❌ Slack connection test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
