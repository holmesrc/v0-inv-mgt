import { NextRequest, NextResponse } from 'next/server'

// Digi-Key API configuration
const DIGIKEY_CLIENT_ID = process.env.DIGIKEY_CLIENT_ID
const DIGIKEY_CLIENT_SECRET = process.env.DIGIKEY_CLIENT_SECRET
const DIGIKEY_API_URL = 'https://api.digikey.com'

interface DigikeyProduct {
  DigiKeyPartNumber: string
  ManufacturerPartNumber: string
  ProductDescription: string
  UnitPrice: number
  QuantityAvailable: number
  Manufacturer: {
    Name: string
  }
  ProductUrl: string
  DatasheetUrl?: string
  PackageType?: {
    Name: string
  }
}

interface SupplierLookupResult {
  supplier: string
  partNumber: string
  manufacturerPartNumber?: string
  description: string
  price?: number
  availability?: number
  manufacturer?: string
  datasheet?: string
  productUrl?: string
  packageType?: string
}

// Get Digi-Key access token
async function getDigikeyToken(): Promise<string | null> {
  console.log('🔑 Getting Digi-Key token...')
  console.log('🔑 Client ID configured:', !!DIGIKEY_CLIENT_ID)
  console.log('🔑 Client Secret configured:', !!DIGIKEY_CLIENT_SECRET)
  
  if (!DIGIKEY_CLIENT_ID || !DIGIKEY_CLIENT_SECRET) {
    console.log('❌ Digi-Key credentials not configured')
    return null
  }

  try {
    console.log('🔑 Making token request to:', `${DIGIKEY_API_URL}/v1/oauth2/token`)
    
    const response = await fetch(`${DIGIKEY_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DIGIKEY_CLIENT_ID,
        client_secret: DIGIKEY_CLIENT_SECRET,
        grant_type: 'client_credentials'
      })
    })

    console.log('🔑 Token response status:', response.status)
    console.log('🔑 Token response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Failed to get Digi-Key token:', response.status, errorText)
      return null
    }

    const data = await response.json()
    console.log('✅ Token received successfully')
    return data.access_token
  } catch (error) {
    console.error('❌ Error getting Digi-Key token:', error)
    return null
  }
}

// Search Digi-Key for parts
async function searchDigikey(partNumber: string, token: string): Promise<SupplierLookupResult[]> {
  console.log('🔍 Searching Digi-Key for:', partNumber)
  
  try {
    // Use keyword search endpoint instead of exact part lookup
    const searchUrl = `${DIGIKEY_API_URL}/products/v4/search/keyword`
    console.log('🔍 Search URL:', searchUrl)
    
    const requestBody = {
      Keywords: partNumber,
      RecordCount: 10,
      RecordStartPosition: 0,
      Sort: {
        SortOption: "SortByUnitPrice",
        Direction: "Ascending"
      }
    }
    
    console.log('🔍 Request body:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-DIGIKEY-Client-Id': DIGIKEY_CLIENT_ID!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('🔍 Search response status:', response.status)
    console.log('🔍 Search response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Digi-Key search failed:', response.status, errorText)
      return []
    }

    const data = await response.json()
    console.log('🔍 Search response data keys:', Object.keys(data))
    console.log('🔍 Products found:', data.Products?.length || 0)
    
    if (data.Products && data.Products.length > 0) {
      console.log('🔍 First product keys:', Object.keys(data.Products[0]))
      console.log('🔍 First product sample:', JSON.stringify(data.Products[0], null, 2))
    }

    const products: DigikeyProduct[] = data.Products || []

    const results = products.slice(0, 5).map(product => ({
      supplier: 'Digi-Key',
      partNumber: product.DigiKeyPartNumber || product.PartNumber,
      manufacturerPartNumber: product.ManufacturerPartNumber || product.MfrPartNumber || product.PartNumber,
      description: product.ProductDescription || product.Description || product.DetailedDescription,
      price: product.UnitPrice || product.Price,
      availability: product.QuantityAvailable || product.Quantity,
      manufacturer: product.Manufacturer?.Name || product.ManufacturerName,
      datasheet: product.DatasheetUrl || product.Datasheet,
      productUrl: product.ProductUrl || product.Url,
      packageType: product.PackageType?.Name || product.Package
    }))

    console.log('✅ Processed results:', results.length)
    if (results.length > 0) {
      console.log('🔍 First processed result:', JSON.stringify(results[0], null, 2))
    }
    return results
  } catch (error) {
    console.error('❌ Error searching Digi-Key:', error)
    return []
  }
}

// Mouser API integration (placeholder for now)
async function searchMouser(partNumber: string): Promise<SupplierLookupResult[]> {
  // TODO: Implement Mouser API when we get API key
  return []
}

// Octopart API integration (placeholder for now)  
async function searchOctopart(partNumber: string): Promise<SupplierLookupResult[]> {
  // TODO: Implement Octopart API when we get API key
  return []
}

export async function POST(request: NextRequest) {
  try {
    const { partNumber, suppliers = ['digikey'] } = await request.json()

    if (!partNumber || !partNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'Part number is required' },
        { status: 400 }
      )
    }

    const results: SupplierLookupResult[] = []

    // Search Digi-Key
    if (suppliers.includes('digikey')) {
      const token = await getDigikeyToken()
      if (token) {
        const digikeyResults = await searchDigikey(partNumber.trim(), token)
        results.push(...digikeyResults)
      }
    }

    // Search Mouser (when implemented)
    if (suppliers.includes('mouser')) {
      const mouserResults = await searchMouser(partNumber.trim())
      results.push(...mouserResults)
    }

    // Search Octopart (when implemented)
    if (suppliers.includes('octopart')) {
      const octopartResults = await searchOctopart(partNumber.trim())
      results.push(...octopartResults)
    }

    return NextResponse.json({
      success: true,
      partNumber: partNumber.trim(),
      results: results,
      searchedSuppliers: suppliers
    })

  } catch (error) {
    console.error('Supplier lookup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    availableSuppliers: ['digikey', 'mouser', 'octopart'],
    configured: {
      digikey: !!(DIGIKEY_CLIENT_ID && DIGIKEY_CLIENT_SECRET),
      mouser: false, // TODO: Check when implemented
      octopart: false // TODO: Check when implemented
    }
  })
}
