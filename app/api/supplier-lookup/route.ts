import { NextRequest, NextResponse } from "next/server"

// Digi-Key API types
interface DigikeyProduct {
  DigiKeyPartNumber: string
  ManufacturerPartNumber: string
  ProductDescription: string
  UnitPrice: number
  QuantityAvailable: number
  Manufacturer?: {
    Name: string
  }
  DatasheetUrl?: string
  ProductUrl?: string
  PackageType?: {
    Name: string
  }
}

// Mouser API types
interface MouserProduct {
  MouserPartNumber: string
  ManufacturerPartNumber: string
  Description: string
  PriceBreaks: Array<{
    Quantity: number
    Price: string
  }>
  Availability: string
  Manufacturer: string
  DataSheetUrl?: string
  ProductDetailUrl?: string
  Category?: string
}

interface MouserSearchResponse {
  SearchResults: {
    NumberOfResult: number
    Parts: MouserProduct[]
  }
}

// Unified result interface
interface SupplierResult {
  supplier: string
  partNumber: string
  manufacturerPartNumber?: string
  description: string
  price?: number
  availability?: number | string
  manufacturer?: string
  datasheet?: string
  productUrl?: string
  packageType?: string
}

export async function POST(request: NextRequest) {
  try {
    const { partNumber, suppliers = ['digikey', 'mouser'] } = await request.json()

    if (!partNumber) {
      return NextResponse.json({
        success: false,
        error: 'Part number is required'
      }, { status: 400 })
    }

    console.log(`🔍 Searching for part: ${partNumber} across suppliers: ${suppliers.join(', ')}`)

    const results: SupplierResult[] = []

    // Search Digi-Key if requested
    if (suppliers.includes('digikey')) {
      try {
        const digikeyResults = await searchDigikey(partNumber)
        results.push(...digikeyResults)
      } catch (error) {
        console.error('❌ Digi-Key search failed:', error)
      }
    }

    // Search Mouser if requested
    if (suppliers.includes('mouser')) {
      try {
        const mouserResults = await searchMouser(partNumber)
        results.push(...mouserResults)
      } catch (error) {
        console.error('❌ Mouser search failed:', error)
      }
    }

    console.log(`✅ Found ${results.length} total results across all suppliers`)

    // Sort results to prioritize by part number pattern match first, then description quality
    const sortedResults = results.sort((a, b) => {
      // Check if the part number matches the expected supplier pattern
      const isDigikeyPN = partNumber.includes('-ND') || partNumber.includes('-CT') || partNumber.includes('-TR')
      const isMouserPN = partNumber.match(/^\d+-/)
      
      const aMatchesPattern = (isDigikeyPN && a.supplier === 'Digi-Key') || (isMouserPN && a.supplier === 'Mouser')
      const bMatchesPattern = (isDigikeyPN && b.supplier === 'Digi-Key') || (isMouserPN && b.supplier === 'Mouser')
      
      console.log(`🔍 Sorting debug for ${partNumber}:`, {
        isDigikeyPN,
        isMouserPN,
        aSupplier: a.supplier,
        bSupplier: b.supplier,
        aMatchesPattern,
        bMatchesPattern,
        aDescription: a.description?.substring(0, 50) + '...',
        bDescription: b.description?.substring(0, 50) + '...'
      })
      
      // First priority: part number pattern match
      if (aMatchesPattern && !bMatchesPattern) return -1
      if (!aMatchesPattern && bMatchesPattern) return 1
      
      // Second priority: description quality
      const aHasDescription = a.description && a.description.trim().length > 0
      const bHasDescription = b.description && b.description.trim().length > 0
      
      if (aHasDescription && !bHasDescription) return -1
      if (!aHasDescription && bHasDescription) return 1
      
      return 0
    })

    console.log(`🔍 Final sorted results:`, sortedResults.map(r => ({ supplier: r.supplier, hasDescription: !!r.description })))

    return NextResponse.json({
      success: true,
      results: sortedResults,
      searchTerm: partNumber,
      suppliersSearched: suppliers
    })

  } catch (error) {
    console.error('❌ Supplier lookup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to search suppliers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function searchDigikey(partNumber: string): Promise<SupplierResult[]> {
  const clientId = process.env.DIGIKEY_CLIENT_ID
  const clientSecret = process.env.DIGIKEY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.log('⚠️ Digi-Key credentials not configured, skipping')
    return []
  }

  console.log('🔍 Searching Digi-Key...')

  // Get access token
  const tokenResponse = await fetch('https://api.digikey.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  })

  if (!tokenResponse.ok) {
    throw new Error(`Digi-Key token request failed: ${tokenResponse.status}`)
  }

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token

  // Search for products
  const searchResponse = await fetch('https://api.digikey.com/products/v4/search/keyword', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-DIGIKEY-Client-Id': clientId
    },
    body: JSON.stringify({
      Keywords: partNumber,
      RecordCount: 5
    })
  })

  if (!searchResponse.ok) {
    throw new Error(`Digi-Key search failed: ${searchResponse.status}`)
  }

  const data = await searchResponse.json()
  const products: DigikeyProduct[] = data.Products || []

  console.log('🔍 Digi-Key search response:', JSON.stringify(data, null, 2))

  const results = products.slice(0, 5).map(product => {
    // Handle description properly
    let description = ""
    if (product.ProductDescription) {
      description = product.ProductDescription
    }

    // Extract manufacturer part number from URL if not available directly
    let manufacturerPartNumber = product.ManufacturerPartNumber
    
    if (!manufacturerPartNumber && product.ProductUrl) {
      const urlMatch = product.ProductUrl.match(/\/detail\/[^\/]+\/([^\/]+)\//)
      if (urlMatch && urlMatch[1]) {
        manufacturerPartNumber = urlMatch[1]
      }
    }

    return {
      supplier: 'Digi-Key',
      partNumber: product.DigiKeyPartNumber,
      manufacturerPartNumber: manufacturerPartNumber || "",
      description: description,
      price: product.UnitPrice,
      availability: product.QuantityAvailable,
      manufacturer: product.Manufacturer?.Name,
      datasheet: product.DatasheetUrl,
      productUrl: product.ProductUrl,
      packageType: product.PackageType?.Name
    }
  })

  console.log('✅ Processed Digi-Key results:', results.length)
  return results
}

async function searchMouser(partNumber: string): Promise<SupplierResult[]> {
  const apiKey = process.env.MOUSER_API_KEY

  if (!apiKey) {
    console.log('⚠️ Mouser API key not configured, skipping')
    return []
  }

  console.log('🔍 Searching Mouser...')

  const searchResponse = await fetch(`https://api.mouser.com/api/v1/search/keyword?apiKey=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      SearchByKeywordRequest: {
        keyword: partNumber,
        records: 5,
        startingRecord: 0
      }
    })
  })

  if (!searchResponse.ok) {
    throw new Error(`Mouser search failed: ${searchResponse.status}`)
  }

  const data: MouserSearchResponse = await searchResponse.json()
  console.log('🔍 Mouser search response:', JSON.stringify(data, null, 2))

  const products = data.SearchResults?.Parts || []

  const results = products.slice(0, 5).map(product => ({
    supplier: 'Mouser',
    partNumber: product.MouserPartNumber,
    manufacturerPartNumber: product.ManufacturerPartNumber || "",
    description: product.Description || "",
    price: product.PriceBreaks?.[0] ? parseFloat(product.PriceBreaks[0].Price.replace('$', '')) : undefined,
    availability: product.Availability || "",
    manufacturer: product.Manufacturer || "",
    datasheet: product.DataSheetUrl || "",
    productUrl: product.ProductDetailUrl || "",
    packageType: product.Category || ""
  }))

  console.log('✅ Processed Mouser results:', results.length)
  return results
}
