import { NextRequest, NextResponse } from "next/server"

// Types for part information
interface PartInfo {
  partNumber: string
  mfgPartNumber?: string
  description?: string
  supplier?: string
  found: boolean
  source?: string
  error?: string
}

// Mouser scraping function
async function scrapeMouser(partNumber: string): Promise<Partial<PartInfo>> {
  try {
    // For now, we'll simulate the scraping with a timeout
    // In a real implementation, you'd use Puppeteer here
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate finding some parts
    if (partNumber.toLowerCase().includes('resistor') || partNumber.includes('R')) {
      return {
        mfgPartNumber: `${partNumber}-MOUSER`,
        description: `Resistor Component - ${partNumber}`,
        supplier: 'Mouser Electronics',
        found: true,
        source: 'mouser'
      }
    }
    
    return { found: false, source: 'mouser' }
  } catch (error) {
    return { 
      found: false, 
      source: 'mouser', 
      error: `Mouser scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// Digikey scraping function
async function scrapeDigikey(partNumber: string): Promise<Partial<PartInfo>> {
  try {
    // For now, we'll simulate the scraping with a timeout
    // In a real implementation, you'd use Puppeteer here
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate finding some parts
    if (partNumber.toLowerCase().includes('capacitor') || partNumber.includes('C')) {
      return {
        mfgPartNumber: `${partNumber}-DIGI`,
        description: `Capacitor Component - ${partNumber}`,
        supplier: 'Digi-Key Electronics',
        found: true,
        source: 'digikey'
      }
    }
    
    return { found: false, source: 'digikey' }
  } catch (error) {
    return { 
      found: false, 
      source: 'digikey', 
      error: `Digikey scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { partNumber } = await request.json()
    
    if (!partNumber || typeof partNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Part number is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔍 Looking up part: ${partNumber}`)
    
    // Search both suppliers concurrently
    const [mouserResult, digikeyResult] = await Promise.all([
      scrapeMouser(partNumber.trim()),
      scrapeDigikey(partNumber.trim())
    ])
    
    // Determine which result to use (prefer the one that found something)
    let result: PartInfo = {
      partNumber: partNumber.trim(),
      found: false
    }
    
    if (mouserResult.found) {
      result = {
        partNumber: partNumber.trim(),
        mfgPartNumber: mouserResult.mfgPartNumber,
        description: mouserResult.description,
        supplier: mouserResult.supplier,
        found: true,
        source: mouserResult.source
      }
    } else if (digikeyResult.found) {
      result = {
        partNumber: partNumber.trim(),
        mfgPartNumber: digikeyResult.mfgPartNumber,
        description: digikeyResult.description,
        supplier: digikeyResult.supplier,
        found: true,
        source: digikeyResult.source
      }
    } else {
      // Neither found the part
      const errors = []
      if (mouserResult.error) errors.push(`Mouser: ${mouserResult.error}`)
      if (digikeyResult.error) errors.push(`Digikey: ${digikeyResult.error}`)
      
      result = {
        partNumber: partNumber.trim(),
        found: false,
        error: errors.length > 0 ? errors.join('; ') : 'Part not found in Mouser or Digikey'
      }
    }
    
    console.log(`✅ Lookup result:`, result)
    
    return NextResponse.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('❌ Part lookup error:', error)
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
    suppliers: ["Mouser Electronics", "Digi-Key Electronics"]
  })
}
