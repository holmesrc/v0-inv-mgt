import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('QTY, "Part number", "Part description"')
    
    if (error) throw error
    
    // Quantity distribution
    const quantities = inventory.map(item => parseInt(item.QTY) || 0)
    const zeroQty = quantities.filter(q => q === 0).length
    const lowQty = quantities.filter(q => q > 0 && q <= 10).length
    const goodQty = quantities.filter(q => q > 10).length
    
    // Description status
    const withDesc = inventory.filter(item => item["Part description"] && item["Part description"].trim() !== '').length
    const withoutDesc = inventory.length - withDesc
    
    // Sample zero-stock items
    const zeroStockSamples = inventory
      .filter(item => parseInt(item.QTY) === 0)
      .slice(0, 10)
      .map(item => ({
        partNumber: item["Part number"],
        description: item["Part description"] || 'undefined'
      }))
    
    return NextResponse.json({
      totalItems: inventory.length,
      quantities: {
        zeroStock: zeroQty,
        lowStock: lowQty,
        goodStock: goodQty
      },
      descriptions: {
        withDescriptions: withDesc,
        missingDescriptions: withoutDesc
      },
      zeroStockSamples
    })
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
