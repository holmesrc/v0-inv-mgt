// Part scraping utilities with serverless compatibility
// Falls back to simulated data when Puppeteer isn't available

interface PartInfo {
  partNumber: string
  mfgPartNumber?: string
  description?: string
  supplier?: string
  found: boolean
  source?: string
  error?: string
  price?: string
  availability?: string
}

// Check if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY

// Fallback scraping for serverless environments
async function fallbackScraping(partNumber: string, source: 'mouser' | 'digikey'): Promise<Partial<PartInfo>> {
  console.log(`⚠️ Using fallback scraping for ${source}: ${partNumber}`)
  
  // Use fetch to get basic page info (limited but works in serverless)
  try {
    const url = source === 'mouser' 
      ? `https://www.mouser.com/ProductDetail/${encodeURIComponent(partNumber)}`
      : `https://www.digikey.com/en/products/detail/${encodeURIComponent(partNumber)}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (response.ok) {
      const html = await response.text()
      
      // Basic HTML parsing to check if part exists
      if (html.includes('Product Details') || html.includes('product-details') || html.includes('pdp-')) {
        return {
          mfgPartNumber: partNumber,
          description: `Electronic Component - ${partNumber}`,
          supplier: source === 'mouser' ? 'Mouser Electronics' : 'Digi-Key Electronics',
          found: true,
          source,
          price: 'See website',
          availability: 'Check website'
        }
      }
    }
    
    return { found: false, source, error: 'Part not found' }
    
  } catch (error) {
    return { 
      found: false, 
      source, 
      error: `Fallback scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

// Real Mouser Electronics scraping
export async function scrapeMouser(partNumber: string): Promise<Partial<PartInfo>> {
  // Use fallback in serverless environments
  if (isServerless) {
    return fallbackScraping(partNumber, 'mouser')
  }

  let browser
  try {
    console.log(`🔍 Real scraping Mouser for: ${partNumber}`)
    
    // Dynamic import to avoid issues in serverless
    const puppeteer = await import('puppeteer')
    
    browser = await puppeteer.default.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })
    const page = await browser.newPage()
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // Navigate to Mouser search
    const searchUrl = `https://www.mouser.com/ProductDetail/${encodeURIComponent(partNumber)}`
    console.log(`🌐 Navigating to: ${searchUrl}`)
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(2000)
    
    // Check if we're on a product page or search results
    const isProductPage = await page.$('.pdp-product-name, .product-details-title, h1[data-testid="product-title"]')
    
    if (isProductPage) {
      // Extract product information
      const productInfo = await page.evaluate(() => {
        // Try multiple selectors for product name/description
        const titleSelectors = [
          '.pdp-product-name',
          '.product-details-title', 
          'h1[data-testid="product-title"]',
          '.product-title',
          'h1'
        ]
        
        let description = ''
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            description = element.textContent.trim()
            break
          }
        }
        
        // Try to get manufacturer part number
        const mfgSelectors = [
          '.pdp-product-mfr-part-number',
          '.manufacturer-part-number',
          '[data-testid="mfr-part-number"]'
        ]
        
        let mfgPartNumber = ''
        for (const selector of mfgSelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            mfgPartNumber = element.textContent.trim()
            break
          }
        }
        
        // Try to get price
        const priceSelectors = [
          '.price-break-price',
          '.pdp-pricing-price',
          '.price',
          '[data-testid="price"]'
        ]
        
        let price = ''
        for (const selector of priceSelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            price = element.textContent.trim()
            break
          }
        }
        
        // Try to get availability
        const availabilitySelectors = [
          '.pdp-product-availability',
          '.availability',
          '[data-testid="availability"]'
        ]
        
        let availability = ''
        for (const selector of availabilitySelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            availability = element.textContent.trim()
            break
          }
        }
        
        return {
          description,
          mfgPartNumber,
          price,
          availability,
          pageTitle: document.title,
          url: window.location.href
        }
      })
      
      console.log(`✅ Mouser product found:`, productInfo)
      
      if (productInfo.description) {
        return {
          mfgPartNumber: productInfo.mfgPartNumber || partNumber,
          description: productInfo.description,
          supplier: 'Mouser Electronics',
          found: true,
          source: 'mouser',
          price: productInfo.price,
          availability: productInfo.availability
        }
      }
    }
    
    // If we get here, part wasn't found
    console.log(`❌ Part not found on Mouser: ${partNumber}`)
    return { 
      found: false, 
      source: 'mouser',
      error: 'Part not found in Mouser catalog'
    }
    
  } catch (error) {
    console.error('❌ Mouser scraping error:', error)
    // Fallback to basic scraping if Puppeteer fails
    return fallbackScraping(partNumber, 'mouser')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Real Digi-Key Electronics scraping
export async function scrapeDigikey(partNumber: string): Promise<Partial<PartInfo>> {
  // Use fallback in serverless environments
  if (isServerless) {
    return fallbackScraping(partNumber, 'digikey')
  }

  let browser
  try {
    console.log(`🔍 Real scraping Digi-Key for: ${partNumber}`)
    
    // Dynamic import to avoid issues in serverless
    const puppeteer = await import('puppeteer')
    
    browser = await puppeteer.default.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })
    const page = await browser.newPage()
    
    // Set user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // Navigate to Digi-Key search
    const searchUrl = `https://www.digikey.com/en/products/detail/${encodeURIComponent(partNumber)}`
    console.log(`🌐 Navigating to: ${searchUrl}`)
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Wait a bit for dynamic content
    await page.waitForTimeout(2000)
    
    // Check if we're on a product page
    const isProductPage = await page.$('.product-details-title, h1[data-testid="product-title"], .pdp-product-name')
    
    if (isProductPage) {
      // Extract product information
      const productInfo = await page.evaluate(() => {
        // Try multiple selectors for product name/description
        const titleSelectors = [
          '.product-details-title',
          'h1[data-testid="product-title"]',
          '.pdp-product-name',
          '.product-title',
          'h1'
        ]
        
        let description = ''
        for (const selector of titleSelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            description = element.textContent.trim()
            break
          }
        }
        
        // Try to get manufacturer part number
        const mfgSelectors = [
          '.product-details-mfr-part-number',
          '.manufacturer-part-number',
          '[data-testid="mfr-part-number"]'
        ]
        
        let mfgPartNumber = ''
        for (const selector of mfgSelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            mfgPartNumber = element.textContent.trim()
            break
          }
        }
        
        // Try to get price
        const priceSelectors = [
          '.price-break-price',
          '.product-dollars',
          '.price',
          '[data-testid="price"]'
        ]
        
        let price = ''
        for (const selector of priceSelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            price = element.textContent.trim()
            break
          }
        }
        
        // Try to get availability
        const availabilitySelectors = [
          '.product-details-availability',
          '.availability',
          '[data-testid="availability"]'
        ]
        
        let availability = ''
        for (const selector of availabilitySelectors) {
          const element = document.querySelector(selector)
          if (element && element.textContent?.trim()) {
            availability = element.textContent.trim()
            break
          }
        }
        
        return {
          description,
          mfgPartNumber,
          price,
          availability,
          pageTitle: document.title,
          url: window.location.href
        }
      })
      
      console.log(`✅ Digi-Key product found:`, productInfo)
      
      if (productInfo.description) {
        return {
          mfgPartNumber: productInfo.mfgPartNumber || partNumber,
          description: productInfo.description,
          supplier: 'Digi-Key Electronics',
          found: true,
          source: 'digikey',
          price: productInfo.price,
          availability: productInfo.availability
        }
      }
    }
    
    // If we get here, part wasn't found
    console.log(`❌ Part not found on Digi-Key: ${partNumber}`)
    return { 
      found: false, 
      source: 'digikey',
      error: 'Part not found in Digi-Key catalog'
    }
    
  } catch (error) {
    console.error('❌ Digi-Key scraping error:', error)
    // Fallback to basic scraping if Puppeteer fails
    return fallbackScraping(partNumber, 'digikey')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Main lookup function that tries multiple suppliers
export async function lookupPart(partNumber: string): Promise<PartInfo> {
  console.log(`🚀 Starting part lookup for: ${partNumber} (serverless: ${isServerless})`)
  
  // Try both suppliers concurrently
  const [mouserResult, digikeyResult] = await Promise.all([
    scrapeMouser(partNumber),
    scrapeDigikey(partNumber)
  ])
  
  // Prefer the result that found something
  if (mouserResult.found) {
    console.log(`✅ Found part on Mouser: ${partNumber}`)
    return {
      partNumber,
      ...mouserResult,
      found: true
    } as PartInfo
  }
  
  if (digikeyResult.found) {
    console.log(`✅ Found part on Digi-Key: ${partNumber}`)
    return {
      partNumber,
      ...digikeyResult,
      found: true
    } as PartInfo
  }
  
  // Neither found the part
  console.log(`❌ Part not found anywhere: ${partNumber}`)
  const errors = []
  if (mouserResult.error) errors.push(`Mouser: ${mouserResult.error}`)
  if (digikeyResult.error) errors.push(`Digi-Key: ${digikeyResult.error}`)
  
  return {
    partNumber,
    found: false,
    error: errors.length > 0 ? errors.join('; ') : 'Part not found in any supplier'
  }
}
