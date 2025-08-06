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

// Enhanced mock data for testing - includes more real parts
const mockPartData: { [key: string]: PartInfo } = {
  'LM358': {
    mfgPartNumber: 'LM358N',
    description: 'Dual Operational Amplifier, 8-Pin DIP',
    supplier: 'Digikey',
    found: true,
    source: 'Mock-Digikey'
  },
  'STM32F103': {
    mfgPartNumber: 'STM32F103C8T6',
    description: '32-bit ARM Cortex-M3 Microcontroller, 64KB Flash',
    supplier: 'Mouser',
    found: true,
    source: 'Mock-Mouser'
  },
  '74HC595': {
    mfgPartNumber: '74HC595N',
    description: '8-bit Serial-in, Serial or Parallel-out Shift Register',
    supplier: 'Digikey',
    found: true,
    source: 'Mock-Digikey'
  },
  '568-4109-1-ND': {
    mfgPartNumber: 'ATMEGA328P-PU',
    description: 'MCU 8-bit ATmega AVR RISC 32KB Flash 28-Pin PDIP',
    supplier: 'Digikey',
    found: true,
    source: 'Mock-Digikey'
  },
  'TC2050-IDC-ND': {
    mfgPartNumber: 'TC2050-IDC',
    description: 'CONN CABLE ASSY 10POS 6" 20AWG',
    supplier: 'Digikey',
    found: true,
    source: 'Mock-Digikey'
  },
  // Add more common parts for testing
  'ATMEGA328P-PU': {
    mfgPartNumber: 'ATMEGA328P-PU',
    description: 'MCU 8-bit ATmega AVR RISC 32KB Flash 28-Pin PDIP',
    supplier: 'Digikey',
    found: true,
    source: 'Mock-Digikey'
  },
  'ESP32-WROOM-32': {
    mfgPartNumber: 'ESP32-WROOM-32',
    description: 'WiFi+BT+BLE MCU Module',
    supplier: 'Mouser',
    found: true,
    source: 'Mock-Mouser'
  },
  'NE555P': {
    mfgPartNumber: 'NE555P',
    description: 'Timer IC Single Precision 8-Pin PDIP',
    supplier: 'Digikey',
    found: true,
    source: 'Mock-Digikey'
  }
}

// Improved web scraping with better headers and error handling
async function searchDigikey(partNumber: string): Promise<PartInfo | null> {
  try {
    // Try multiple Digikey URL patterns
    const searchUrls = [
      `https://www.digikey.com/en/products/detail/${encodeURIComponent(partNumber)}`,
      `https://www.digikey.com/products/en?keywords=${encodeURIComponent(partNumber)}`,
      `https://www.digikey.com/en/products/filter?keywords=${encodeURIComponent(partNumber)}`
    ]
    
    for (const searchUrl of searchUrls) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.log(`Digikey search failed for ${searchUrl}: ${response.status}`)
          continue
        }

        const html = await response.text()
        
        // Enhanced patterns for Digikey
        const mfgPatterns = [
          /data-testid="mfr-part-number"[^>]*>([^<]+)</i,
          /Mfr[\s]*\.?[\s]*Part[\s]*#[^>]*>([^<]+)</i,
          /manufacturer-part-number[^>]*>([^<]+)</i,
          /"mfgPartNumber":"([^"]+)"/i,
          /Manufacturer Part Number[^>]*>([^<]+)</i,
          /<span[^>]*class="[^"]*part-number[^"]*"[^>]*>([^<]+)</i
        ]
        
        const descPatterns = [
          /data-testid="product-description"[^>]*>([^<]+)</i,
          /<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)</i,
          /product-description[^>]*>([^<]+)</i,
          /"description":"([^"]+)"/i,
          /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
          /<title>([^<]+)<\/title>/i
        ]

        let mfgPartNumber = ''
        let description = ''

        // Try to find manufacturer part number
        for (const pattern of mfgPatterns) {
          const match = html.match(pattern)
          if (match && match[1] && match[1].trim().length > 2) {
            mfgPartNumber = decodeHtmlEntities(cleanText(match[1]))
            break
          }
        }

        // Try to find description
        for (const pattern of descPatterns) {
          const match = html.match(pattern)
          if (match && match[1] && match[1].trim().length > 5) {
            description = decodeHtmlEntities(cleanText(match[1]))
            // Clean up common title suffixes
            description = description.replace(/\s*-\s*Digi-Key.*$/i, '')
            description = description.replace(/\s*\|\s*Digi-Key.*$/i, '')
            break
          }
        }
        
        if (mfgPartNumber || description) {
          console.log(`✅ Found Digikey data: MFG="${mfgPartNumber}", DESC="${description?.substring(0, 50)}..."`)
          return {
            mfgPartNumber: mfgPartNumber || '',
            description: description || '',
            supplier: 'Digikey',
            found: true,
            source: 'Digikey'
          }
        } else {
          console.log(`❌ Digikey search found no usable data for ${searchUrl}`)
        }
      } catch (urlError) {
        console.log(`Digikey URL ${searchUrl} failed:`, urlError)
        continue
      }
    }

    return null
  } catch (error) {
    console.error('Digikey search error:', error)
    return null
  }
}

// Improved Mouser search
async function searchMouser(partNumber: string): Promise<PartInfo | null> {
  try {
    const searchUrls = [
      `https://www.mouser.com/ProductDetail/${encodeURIComponent(partNumber)}`,
      `https://www.mouser.com/c/?q=${encodeURIComponent(partNumber)}`
    ]
    
    for (const searchUrl of searchUrls) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.log(`Mouser search failed for ${searchUrl}: ${response.status}`)
          continue
        }

        const html = await response.text()
        
        // Enhanced patterns for Mouser
        const mfgPatterns = [
          /Mfr[\s]*\.?[\s]*Part[\s]*#[^>]*>([^<]+)</i,
          /manufacturer-part-number[^>]*>([^<]+)</i,
          /"mfrPartNumber":"([^"]+)"/i,
          /mfr-part-number[^>]*>([^<]+)</i,
          /<span[^>]*class="[^"]*mfr[^"]*"[^>]*>([^<]+)</i
        ]
        
        const descPatterns = [
          /product-title[^>]*>([^<]+)</i,
          /<h1[^>]*>([^<]+)<\/h1>/i,
          /"productTitle":"([^"]+)"/i,
          /product-name[^>]*>([^<]+)</i,
          /<title>([^<]+)<\/title>/i
        ]

        let mfgPartNumber = ''
        let description = ''

        // Try to find manufacturer part number
        for (const pattern of mfgPatterns) {
          const match = html.match(pattern)
          if (match && match[1] && match[1].trim().length > 2) {
            mfgPartNumber = decodeHtmlEntities(cleanText(match[1]))
            break
          }
        }

        // Try to find description
        for (const pattern of descPatterns) {
          const match = html.match(pattern)
          if (match && match[1] && match[1].trim().length > 5) {
            description = decodeHtmlEntities(cleanText(match[1]))
            // Clean up common title suffixes
            description = description.replace(/\s*-\s*Mouser.*$/i, '')
            description = description.replace(/\s*\|\s*Mouser.*$/i, '')
            break
          }
        }
        
        if (mfgPartNumber || description) {
          console.log(`✅ Found Mouser data: MFG="${mfgPartNumber}", DESC="${description?.substring(0, 50)}..."`)
          return {
            mfgPartNumber: mfgPartNumber || '',
            description: description || '',
            supplier: 'Mouser',
            found: true,
            source: 'Mouser'
          }
        } else {
          console.log(`❌ Mouser search found no usable data for ${searchUrl}`)
        }
      } catch (urlError) {
        console.log(`Mouser URL ${searchUrl} failed:`, urlError)
        continue
      }
    }

    return null
  } catch (error) {
    console.error('Mouser search error:', error)
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

    // Smart search order based on part number format
    const isDigikeyFormat = cleanPartNumber.match(/-ND$/i) || cleanPartNumber.match(/-\d+-ND$/i) || cleanPartNumber.match(/-CT-ND$/i)
    const isMouserFormat = cleanPartNumber.match(/^\d{3}-\d{4}/) // Mouser format like 595-TL072CP
    
    console.log(`Part format detection: Digikey=${!!isDigikeyFormat}, Mouser=${!!isMouserFormat}`)

    // FIRST: Try real web scraping from actual websites
    try {
      console.log('🌐 Attempting REAL web scraping from Digikey and Mouser...')
      
      let searchPromises: Promise<PartInfo | null>[]
      
      if (isDigikeyFormat) {
        // Search Digikey first for Digikey-format parts
        searchPromises = [
          searchDigikey(cleanPartNumber),
          searchMouser(cleanPartNumber),
        ]
        console.log('🔍 Searching Digikey first (detected Digikey format)')
      } else if (isMouserFormat) {
        // Search Mouser first for Mouser-format parts
        searchPromises = [
          searchMouser(cleanPartNumber),
          searchDigikey(cleanPartNumber),
        ]
        console.log('🔍 Searching Mouser first (detected Mouser format)')
      } else {
        // Search both simultaneously for generic parts
        searchPromises = [
          searchDigikey(cleanPartNumber),
          searchMouser(cleanPartNumber),
        ]
        console.log('🔍 Searching both Digikey and Mouser simultaneously')
      }

      // Wait for real searches with timeout
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 15000) // 15 second timeout for real scraping
      })

      const raceResult = await Promise.race([
        Promise.allSettled(searchPromises),
        timeoutPromise
      ])

      if (raceResult) {
        const results = raceResult as PromiseSettledResult<PartInfo | null>[]
        
        // Find the best result from REAL web scraping
        let bestResult: PartInfo | null = null
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i]
          const siteName = i === 0 ? (isMouserFormat ? 'Mouser' : 'Digikey') : (isMouserFormat ? 'Digikey' : 'Mouser')
          
          console.log(`🔍 ${siteName} search result:`, result.status)
          
          if (result.status === 'fulfilled' && result.value && result.value.found) {
            const value = result.value
            console.log(`📋 ${siteName} returned:`, {
              mfg: value.mfgPartNumber || '(empty)',
              desc: value.description ? value.description.substring(0, 50) + '...' : '(empty)',
              supplier: value.supplier,
              source: value.source
            })
            
            // Prefer results with both mfg part number and description
            if (value.mfgPartNumber && value.description && value.mfgPartNumber.trim() && value.description.trim()) {
              bestResult = value
              console.log(`✅ Selected COMPLETE result from ${value.source}`)
              break
            } else if (value.mfgPartNumber && value.mfgPartNumber.trim() && !bestResult) {
              bestResult = value
              console.log(`⚠️ Selected PARTIAL result from ${value.source} (has MFG part number)`)
            } else if (value.description && value.description.trim() && !bestResult) {
              bestResult = value
              console.log(`⚠️ Selected PARTIAL result from ${value.source} (has description)`)
            }
          } else if (result.status === 'rejected') {
            console.log(`❌ ${siteName} search failed:`, result.reason)
          } else {
            console.log(`❌ ${siteName} search returned no data`)
          }
        }

        if (bestResult) {
          console.log(`🎉 Found REAL data from ${bestResult.source}!`)
          
          return NextResponse.json({
            success: true,
            data: bestResult
          })
        } else {
          console.log('❌ No results from real web scraping')
        }
      } else {
        console.log('⏰ Real web scraping timed out after 15 seconds')
      }
    } catch (scrapingError) {
      console.error('💥 Real web scraping failed:', scrapingError)
    }

    // FALLBACK: Only use mock data if real scraping completely fails
    console.log('📚 Real scraping failed, checking mock data as fallback...')
    const mockResult = mockPartData[cleanPartNumber.toUpperCase()]
    if (mockResult) {
      console.log(`📋 Found mock data for: ${cleanPartNumber} (fallback only)`)
      // Add a small delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 800))
      return NextResponse.json({
        success: true,
        data: {
          ...mockResult,
          source: mockResult.source + ' (Fallback - Real scraping failed)'
        }
      })
    }

    // No results found anywhere
    console.log(`No part info found for: ${cleanPartNumber}`)
    return NextResponse.json({
      success: false,
      message: 'Part not found in Digikey, Mouser, or mock data',
      data: {
        mfgPartNumber: '',
        description: '',
        supplier: '',
        found: false
      }
    })

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
