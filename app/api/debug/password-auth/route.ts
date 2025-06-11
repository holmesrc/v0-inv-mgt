import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  const uploadPassword = process.env.UPLOAD_PASSWORD

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    uploadPassword: {
      exists: !!uploadPassword,
      length: uploadPassword?.length || 0,
      type: typeof uploadPassword,
      value: uploadPassword || "NOT_SET",
      hasWhitespace: uploadPassword ? /\s/.test(uploadPassword) : false,
      charCodes: uploadPassword
        ? Array.from(uploadPassword).map((char, index) => ({
            char,
            code: char.charCodeAt(0),
            position: index,
          }))
        : [],
    },
    testValues: {
      comparison: uploadPassword === "PHL10HWLab",
      trimmedComparison: uploadPassword?.trim() === "PHL10HWLab",
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { testPassword } = await request.json()
    const expectedPassword = process.env.UPLOAD_PASSWORD

    const analysis = {
      received: {
        value: testPassword,
        length: testPassword?.length || 0,
        type: typeof testPassword,
        charCodes: testPassword
          ? Array.from(testPassword).map((char, index) => ({
              char,
              code: char.charCodeAt(0),
              position: index,
            }))
          : [],
      },
      expected: {
        value: expectedPassword || "NOT_SET",
        length: expectedPassword?.length || 0,
        type: typeof expectedPassword,
        charCodes: expectedPassword
          ? Array.from(expectedPassword).map((char, index) => ({
              char,
              code: char.charCodeAt(0),
              position: index,
            }))
          : [],
      },
      comparisons: {
        exact: testPassword === expectedPassword,
        trimmed: testPassword?.trim() === expectedPassword?.trim(),
        lowercase: testPassword?.toLowerCase() === expectedPassword?.toLowerCase(),
        uppercased: testPassword?.toUpperCase() === expectedPassword?.toUpperCase(),
      },
      differences: [],
    }

    // Find character differences
    if (testPassword && expectedPassword) {
      const maxLength = Math.max(testPassword.length, expectedPassword.length)
      for (let i = 0; i < maxLength; i++) {
        const receivedChar = testPassword[i] || ""
        const expectedChar = expectedPassword[i] || ""

        if (receivedChar !== expectedChar) {
          analysis.differences.push({
            position: i,
            received: {
              char: receivedChar,
              code: receivedChar.charCodeAt(0) || 0,
            },
            expected: {
              char: expectedChar,
              code: expectedChar.charCodeAt(0) || 0,
            },
          })
        }
      }
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
