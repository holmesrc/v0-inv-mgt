import { NextResponse } from "next/server"

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
      value: uploadPassword, // Show the actual value for debugging
      type: typeof uploadPassword,
      hasWhitespace: uploadPassword ? /\s/.test(uploadPassword) : false,
      startsWithSpace: uploadPassword ? uploadPassword.startsWith(" ") : false,
      endsWithSpace: uploadPassword ? uploadPassword.endsWith(" ") : false,
      charCodes: uploadPassword ? Array.from(uploadPassword).map((char) => ({ char, code: char.charCodeAt(0) })) : [],
    },
    testValues: {
      direct: "PHL10HWLab",
      comparison: uploadPassword === "PHL10HWLab",
      trimmedComparison: uploadPassword?.trim() === "PHL10HWLab",
    },
  })
}

export async function POST(request: Request) {
  try {
    const { testPassword } = await request.json()
    const expectedPassword = process.env.UPLOAD_PASSWORD

    // Detailed comparison analysis
    const analysis = {
      received: {
        value: testPassword,
        length: testPassword?.length || 0,
        type: typeof testPassword,
        charCodes: testPassword ? Array.from(testPassword).map((char) => ({ char, code: char.charCodeAt(0) })) : [],
      },
      expected: {
        value: expectedPassword,
        length: expectedPassword?.length || 0,
        type: typeof expectedPassword,
        charCodes: expectedPassword
          ? Array.from(expectedPassword).map((char) => ({ char, code: char.charCodeAt(0) }))
          : [],
      },
      comparisons: {
        exact: testPassword === expectedPassword,
        trimmed: testPassword?.trim() === expectedPassword?.trim(),
        lowercase: testPassword?.toLowerCase() === expectedPassword?.toLowerCase(),
        bothTrimmedLowercase: testPassword?.trim().toLowerCase() === expectedPassword?.trim().toLowerCase(),
      },
      differences: [],
    }

    // Find character differences
    if (testPassword && expectedPassword) {
      const maxLength = Math.max(testPassword.length, expectedPassword.length)
      for (let i = 0; i < maxLength; i++) {
        const receivedChar = testPassword[i] || "(missing)"
        const expectedChar = expectedPassword[i] || "(missing)"
        if (receivedChar !== expectedChar) {
          analysis.differences.push({
            position: i,
            received: { char: receivedChar, code: receivedChar.charCodeAt ? receivedChar.charCodeAt(0) : null },
            expected: { char: expectedChar, code: expectedChar.charCodeAt ? expectedChar.charCodeAt(0) : null },
          })
        }
      }
    }

    return NextResponse.json({
      success: analysis.comparisons.exact,
      analysis,
    })
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
