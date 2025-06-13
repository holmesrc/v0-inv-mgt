import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("Simple test API called")

    return NextResponse.json(
      {
        success: true,
        message: "Simple test successful",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("Simple test error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Simple test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
