import { NextRequest, NextResponse } from 'next/server'

interface PartInfo {
  mfgPartNumber: string
  description: string
  supplier: string
  found: boolean
  source?: string
}

// Helper function to clean and normalize text
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\.\(\)\[\]\/,&]/g, '')
    .trim()
}

// Helper function to extract text between HTML tags
function extractTextBetweenTags(html: string, tagPattern: RegExp): string {
  const match = html.match(tagPattern)
  if (match && match[1]) {
    return cleanText(match[1].replace(/<[^>]*>/g, ''))
  }
  return ''
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' '
  }
  
  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entities[entity] || entity
  })
}

// Search Digikey for part information
async function searchDigikey(partNumber: string): Promise<PartInfo | null> {
  try {
    const searchUrl = `https://www.digikey.com/en/products/filter?keywords=${encodeURIComponent(partNumber)}&ColumnSort=0&page=1&quantity=0&rohs=All&automotive=All&operatingTemp=All&monthlySavings=All&newProducts=All`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`Digikey search failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    
    // Multiple patterns to try for Digikey
    const mfgPatterns = [
      /data-testid="mfr-part-number"[^>]*>([^<]+)</i,
      /Mfr[\s]*Part[\s]*#[^>]*>([^<]+)</i,
      /manufacturer-part-number[^>]*>([^<]+)</i,
      /"mfgPartNumber":"([^"]+)"/i,
    ]
    
    const descPatterns = [
      /data-testid="product-description"[^>]*>([^<]+)</i,
      /<td[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)</i,
      /product-description[^>]*>([^<]+)</i,
      /"description":"([^"]+)"/i,
    ]

    let mfgPartNumber = ''
    let description = ''

    // Try to find manufacturer part number
    for (const pattern of mfgPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        mfgPartNumber = decodeHtmlEntities(cleanText(match[1]))
        break
      }
    }

    // Try to find description
    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        description = decodeHtmlEntities(cleanText(match[1]))
        break
      }
    }
    
    if (mfgPartNumber || description) {
      return {
        mfgPartNumber,
        description,
        supplier: 'Digikey',
        found: true,
        source: 'Digikey'
      }
    }

    return null
  } catch (error) {
    console.error('Digikey search error:', error)
    return null
  }
}

// Search Mouser for part information
async function searchMouser(partNumber: string): Promise<PartInfo | null> {
  try {
    const searchUrl = `https://www.mouser.com/ProductDetail/${encodeURIComponent(partNumber)}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.log(`Mouser search failed: ${response.status}`)
      return null
    }

    const html = await response.text()
    
    // Multiple patterns to try for Mouser
    const mfgPatterns = [
      /Mfr[\s]*\.?[\s]*Part[\s]*#[^>]*>([^<]+)</i,
      /manufacturer-part-number[^>]*>([^<]+)</i,
      /"mfrPartNumber":"([^"]+)"/i,
      /mfr-part-number[^>]*>([^<]+)</i,
    ]
    
    const descPatterns = [
      /product-title[^>]*>([^<]+)</i,
      /description[^>]*>([^<]+)</i,
      /"productTitle":"([^"]+)"/i,
      /product-name[^>]*>([^<]+)</i,
    ]

    let mfgPartNumber = ''
    let description = ''

    // Try to find manufacturer part number
    for (const pattern of mfgPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        mfgPartNumber = decodeHtmlEntities(cleanText(match[1]))
        break
      }
    }

    // Try to find description
    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        description = decodeHtmlEntities(cleanText(match[1]))
        break
      }
    }
    
    if (mfgPartNumber || description) {
      return {
        mfgPartNumber,
        description,
        supplier: 'Mouser',
        found: true,
        source: 'Mouser'
      }
    }

    return null
  } catch (error) {
    console.error('Mouser search error:', error)
    return null
  }
}

// Alternative approach using a more generic search
async function searchGeneric(partNumber: string, site: string): Promise<PartInfo | null> {
  try {
    let searchUrl = ''
    if (site === 'digikey') {
      searchUrl = `https://www.digikey.com/products/en?keywords=${encodeURIComponent(partNumber)}`
    } else if (site === 'mouser') {
      searchUrl = `https://www.mouser.com/c/?q=${encodeURIComponent(partNumber)}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) return null

    const html = await response.text()
    
    // Generic patterns that might work across sites
    const mfgPatterns = [
      /(?:mfr|manufacturer|mfg)[\s\w]*(?:part|#|number)[\s\w]*[>:][\s]*([A-Z0-9\-_\.]+)/i,
      /part[\s]*#[\s]*([A-Z0-9\-_\.]+)/i,
      /"mfgPartNumber":"([^"]+)"/i,
      /"manufacturerPartNumber":"([^"]+)"/i,
    ]
    
    const descPatterns = [
      /(?:description|title)[\s\w]*[>:][\s]*([^<\n]{10,150})/i,
      /"description":"([^"]+)"/i,
      /"productTitle":"([^"]+)"/i,
    ]

    let mfgPart = ''
    let description = ''

    // Try to find manufacturer part number
    for (const pattern of mfgPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].length > 2) {
        mfgPart = decodeHtmlEntities(cleanText(match[1]))
        break
      }
    }

    // Try to find description
    for (const pattern of descPatterns) {
      const match = html.match(pattern)
      if (match && match[1] && match[1].length > 5) {
        description = decodeHtmlEntities(cleanText(match[1]))
        break
      }
    }

    if (mfgPart || description) {
      return {
        mfgPartNumber: mfgPart,
        description: description,
        supplier: site === 'digikey' ? 'Digikey' : 'Mouser',
        found: true,
        source: `${site}-generic`
      }
    }

    return null
  } catch (error) {
    console.error(`Generic search error for ${site}:`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { partNumber } = await request.json()

    if (!partNumber || typeof partNumber !== 'string') {
      return NextResponse.json(
        { error: 'Part number is required' },
        { status: 400 }
      )
    }

    const cleanPartNumber = partNumber.trim()
    if (!cleanPartNumber) {
      return NextResponse.json(
        { error: 'Part number cannot be empty' },
        { status: 400 }
      )
    }

    console.log(`Looking up part: ${cleanPartNumber}`)

    // Try multiple search strategies with different timeouts
    const searchPromises = [
      searchDigikey(cleanPartNumber),
      searchMouser(cleanPartNumber),
      searchGeneric(cleanPartNumber, 'digikey'),
      searchGeneric(cleanPartNumber, 'mouser'),
    ]

    // Wait for all searches to complete or timeout (max 15 seconds total)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 15000)
    })

    const raceResult = await Promise.race([
      Promise.allSettled(searchPromises),
      timeoutPromise
    ])

    if (!raceResult) {
      console.log(`Timeout looking up part: ${cleanPartNumber}`)
      return NextResponse.json({
        success: false,
        message: 'Search timeout - please try again',
        data: {
          mfgPartNumber: '',
          description: '',
          supplier: '',
          found: false
        }
      })
    }

    const results = raceResult as PromiseSettledResult<PartInfo | null>[]
    
    // Find the best result
    let bestResult: PartInfo | null = null
    let fallbackResult: PartInfo | null = null
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value && result.value.found) {
        const value = result.value
        
        // Prefer results with both mfg part number and description
        if (value.mfgPartNumber && value.description) {
          bestResult = value
          break
        } 
        // Keep track of partial results as fallback
        else if (!fallbackResult && (value.mfgPartNumber || value.description)) {
          fallbackResult = value
        }
      }
    }

    const finalResult = bestResult || fallbackResult

    if (finalResult) {
      console.log(`Found part info from ${finalResult.source}:`, {
        mfgPartNumber: finalResult.mfgPartNumber,
        description: finalResult.description?.substring(0, 50) + '...',
        supplier: finalResult.supplier
      })
      
      return NextResponse.json({
        success: true,
        data: finalResult
      })
    } else {
      console.log(`No part info found for: ${cleanPartNumber}`)
      return NextResponse.json({
        success: false,
        message: 'Part not found in Digikey or Mouser',
        data: {
          mfgPartNumber: '',
          description: '',
          supplier: '',
          found: false
        }
      })
    }

  } catch (error) {
    console.error('Part lookup API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error during part lookup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support GET requests for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const partNumber = searchParams.get('partNumber')

  if (!partNumber) {
    return NextResponse.json(
      { error: 'Part number parameter is required' },
      { status: 400 }
    )
  }

  // Convert GET to POST format
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partNumber })
  }))
}
