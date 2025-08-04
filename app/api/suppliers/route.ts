import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // Get unique suppliers from inventory
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('Supplier')

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch suppliers' },
        { status: 500 }
      )
    }

    // Extract unique suppliers
    const uniqueSuppliers = Array.from(new Set(
      inventory
        .map(item => item.Supplier)
        .filter(supplier => supplier && supplier.trim() !== "")
        .map(supplier => supplier.trim())
    )).sort()

    return NextResponse.json({
      success: true,
      suppliers: uniqueSuppliers
    })

  } catch (error) {
    console.error('Suppliers API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supplier } = await request.json()

    if (!supplier || !supplier.trim()) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    // Check if supplier already exists
    const { data: existingSuppliers } = await supabase
      .from('inventory')
      .select('Supplier')
      .eq('Supplier', supplier.trim())
      .limit(1)

    if (existingSuppliers && existingSuppliers.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Supplier already exists',
        supplier: supplier.trim()
      })
    }

    // For new suppliers, we don't need to do anything special here
    // They will be automatically included when inventory is updated
    return NextResponse.json({
      success: true,
      message: 'Supplier will be added when inventory item is approved',
      supplier: supplier.trim()
    })

  } catch (error) {
    console.error('Add supplier error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
