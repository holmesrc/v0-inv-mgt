import { NextRequest, NextResponse } from "next/server"
import { lookupPart } from "../../../../lib/part-scraper"

export async function POST(request: NextRequest) {
  try {
    const { partNumber } = await request.json()
    
    if (!partNumber || typeof partNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Part number is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 API: Looking up part: ${partNumber}`)
    
    // Use our scraping library
    const result = await lookupPart(partNumber.trim())
    
    console.log(`✅ API: Lookup result:`, result)
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('❌ Part lookup API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Part lookup API endpoint",
    usage: "POST with { partNumber: 'your-part-number' }",
    suppliers: ["Mouser Electronics", "Digi-Key Electronics"],
    features: [
      "Auto-populates MFG Part Number",
      "Auto-populates Description", 
      "Auto-populates Supplier",
      "Shows pricing information",
      "Shows availability status"
    ]
  })
}
