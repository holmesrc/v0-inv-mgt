import { type NextRequest, NextResponse } from "next/server"
import {
  uploadExcelFile,
  readInventoryFromExcel,
  getExcelFileMetadata,
  excelFileExists,
  isStorageAvailable,
  initializeStorage,
} from "@/lib/storage"

// Get Excel file status and metadata
export async function GET() {
  try {
    if (!isStorageAvailable()) {
      return NextResponse.json({
        exists: false,
        configured: false,
        message: "Supabase storage is not configured. Please set up your environment variables.",
      })
    }

    const exists = await excelFileExists()

    if (!exists) {
      return NextResponse.json({
        exists: false,
        configured: true,
        message: "No Excel file has been uploaded",
      })
    }

    const metadata = await getExcelFileMetadata()

    return NextResponse.json({
      exists: true,
      configured: true,
      metadata,
      message: "Excel file exists in storage",
    })
  } catch (error) {
    console.error("Error checking Excel file status:", error)
    return NextResponse.json(
      {
        error: "Failed to check Excel file status",
        configured: false,
      },
      { status: 500 },
    )
  }
}

// Upload a new Excel file
export async function POST(request: NextRequest) {
  try {
    if (!isStorageAvailable()) {
      return NextResponse.json(
        {
          error: "Supabase storage is not configured. Please set up your environment variables.",
          configured: false,
        },
        { status: 503 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Invalid file type. Only Excel files (.xlsx, .xls) are allowed." },
        { status: 400 },
      )
    }

    console.log("File received:", { name: file.name, size: file.size, type: file.type })

    // Make sure the bucket exists before trying to upload
    try {
      await initializeStorage()
      console.log("Storage bucket initialized successfully")
    } catch (bucketError) {
      console.error("Error initializing storage bucket:", bucketError)
      return NextResponse.json(
        {
          error: "Failed to initialize storage bucket",
          details: bucketError instanceof Error ? bucketError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Upload the file with more detailed error handling
    try {
      const result = await uploadExcelFile(file)

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 500 })
      }

      console.log("File uploaded successfully")
    } catch (uploadError) {
      console.error("Error in uploadExcelFile:", uploadError)
      return NextResponse.json(
        {
          error: "Failed to upload Excel file",
          details: uploadError instanceof Error ? uploadError.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    // Read the inventory data from the uploaded file
    try {
      const inventoryData = await readInventoryFromExcel()
      console.log("Inventory data read successfully:", { count: inventoryData.inventory.length })

      return NextResponse.json({
        success: true,
        message: "Excel file uploaded successfully",
        inventoryCount: inventoryData.inventory.length,
        packageNote: inventoryData.packageNote,
      })
    } catch (readError) {
      console.error("Error reading inventory data:", readError)
      return NextResponse.json(
        {
          error: "File uploaded but failed to read inventory data",
          details: readError instanceof Error ? readError.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Unhandled error in Excel upload:", error)
    return NextResponse.json(
      {
        error: "Failed to process Excel file",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

// Read inventory data from the stored Excel file
export async function PUT() {
  try {
    if (!isStorageAvailable()) {
      return NextResponse.json(
        {
          error: "Supabase storage is not configured",
          configured: false,
        },
        { status: 503 },
      )
    }

    const result = await readInventoryFromExcel()

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inventory: result.inventory,
      packageNote: result.packageNote,
      count: result.inventory.length,
    })
  } catch (error) {
    console.error("Error reading inventory from Excel:", error)
    return NextResponse.json({ error: "Failed to read inventory from Excel file" }, { status: 500 })
  }
}
