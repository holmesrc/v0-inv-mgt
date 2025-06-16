import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { items } = await request.json()

    // Import the message creation functions
    const { createLowStockAlertMessage, testSlackWebhook } = await import("@/lib/slack")

    // Create the test message (the one that works)
    const testMessage = {
      text: "🧪 Test message from Inventory Management System",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🧪 *Test Message*\n\nThis is a test message to verify the Slack webhook is working correctly.",
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Sent from: ${process.env.NEXT_PUBLIC_APP_URL || "Unknown URL"} at ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    }

    // Create the low stock alert message (the one that fails)
    const lowStockMessage = createLowStockAlertMessage(items)

    // Get message sizes
    const testMessageSize = JSON.stringify(testMessage).length
    const lowStockMessageSize = JSON.stringify(lowStockMessage).length

    // Check for potential issues
    const analysis = {
      testMessage: {
        size: testMessageSize,
        hasBlocks: !!testMessage.blocks,
        blockCount: testMessage.blocks?.length || 0,
        textLength: testMessage.text.length,
        content: testMessage,
      },
      lowStockMessage: {
        size: lowStockMessageSize,
        hasBlocks: false, // Low stock message is just text
        textLength: lowStockMessage.length,
        content: lowStockMessage,
        preview: lowStockMessage.substring(0, 200) + "...",
      },
      comparison: {
        sizeDifference: lowStockMessageSize - testMessageSize,
        testMessageWorks: true,
        lowStockMessageFails: true,
        potentialIssues: [],
      },
    }

    // Identify potential issues
    if (lowStockMessageSize > 4000) {
      analysis.comparison.potentialIssues.push("Message too long (>4000 chars)")
    }

    if (lowStockMessage.includes("slack.com/shortcuts")) {
      analysis.comparison.potentialIssues.push("Contains Slack shortcut links")
    }

    if (lowStockMessage.split("\n").length > 20) {
      analysis.comparison.potentialIssues.push("Too many line breaks")
    }

    // Check for problematic characters
    const problematicChars = /[^\x00-\x7F]/g
    const nonAsciiMatches = lowStockMessage.match(problematicChars)
    if (nonAsciiMatches && nonAsciiMatches.length > 10) {
      analysis.comparison.potentialIssues.push(`Many non-ASCII characters (${nonAsciiMatches.length})`)
    }

    return NextResponse.json({
      success: true,
      analysis,
      recommendations: [
        "Try sending a simplified version of the low stock message",
        "Remove or replace Slack shortcut links with regular URLs",
        "Reduce message length if over 4000 characters",
        "Test with fewer items first",
      ],
    })
  } catch (error) {
    console.error("Error comparing messages:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
