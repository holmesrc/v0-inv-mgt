import { NextResponse } from "next/server"

export async function GET() {
  console.log("=== SLACK URL DEBUG TEST ===")

  // Check all environment variables that might affect URL generation
  const envVars = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }

  console.log("Environment variables:", envVars)

  // Test the URL construction logic from the Slack notification
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"
  const approvalUrl = `${appUrl}/approvals`

  console.log("Constructed approval URL:", approvalUrl)

  // Check if there's any URL manipulation happening
  const urlTests = {
    directAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    fallbackUrl: "https://v0-inv-mgt.vercel.app",
    constructedUrl: appUrl,
    finalApprovalUrl: approvalUrl,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }

  // Simulate the exact logic from send-batch-approval-request
  const simulatedLogic = {
    step1_getAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    step2_fallback: process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app",
    step3_finalUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"}/approvals`,
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    environmentVariables: envVars,
    urlTests,
    simulatedLogic,
    issue: {
      expectedUrl: "https://v0-inv-mgt.vercel.app/approvals",
      actualUrlInSlack: "https://oltguirvoqokvhprglbx.supabase.co/approvals",
      possibleCause: "NEXT_PUBLIC_APP_URL might be set to Supabase URL instead of app URL",
    },
    recommendations: [
      "Check if NEXT_PUBLIC_APP_URL is set correctly in Vercel environment variables",
      "Verify the environment variable is not accidentally set to Supabase URL",
      "Check if there's any code that's overriding the URL construction",
    ],
  })
}

export async function POST() {
  console.log("=== TESTING SLACK URL CONSTRUCTION ===")

  try {
    // Simulate the exact batch approval request logic
    const mockBatchData = {
      batchItems: [
        {
          part_number: "TEST-123",
          part_description: "Test Item",
          qty: 10,
          supplier: "TEST SUPPLIER",
          location: "TEST-LOC",
        },
      ],
      requestedBy: "debug-test",
      changeId: "debug-test-id",
    }

    // Use the exact same logic as the batch approval endpoint
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v0-inv-mgt.vercel.app"

    console.log("Raw NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL)
    console.log("Constructed appUrl:", appUrl)

    const message =
      `🔄 *DEBUG TEST - Batch Inventory Change Request*\n\n` +
      `*Type:* BATCH ADD\n` +
      `*Requested by:* ${mockBatchData.requestedBy}\n` +
      `*Change ID:* ${mockBatchData.changeId}\n\n` +
      `*Adding ${mockBatchData.batchItems.length} New Items:*\n` +
      `📋 Please review this batch change in the approval dashboard:\n` +
      `${appUrl}/approvals`

    return NextResponse.json({
      success: true,
      debugInfo: {
        rawEnvVar: process.env.NEXT_PUBLIC_APP_URL,
        constructedAppUrl: appUrl,
        finalMessage: message,
        urlInMessage: `${appUrl}/approvals`,
      },
      message: "Debug test completed - check logs and response",
    })
  } catch (error) {
    console.error("Debug test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
