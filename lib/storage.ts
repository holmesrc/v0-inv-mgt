import { supabase, canUseSupabase } from "./supabase"
import * as XLSX from "xlsx"
import type { InventoryItem } from "@/types/inventory"

const BUCKET_NAME = "inventory-files"
const DEFAULT_FILE_NAME = "current-inventory.xlsx"

// Check if storage is available
export function isStorageAvailable(): boolean {
  return canUseSupabase()
}

// Initialize storage bucket if it doesn't exist
export async function initializeStorage() {
  if (!canUseSupabase() || !supabase) {
    throw new Error("Supabase is not configured. Please set up your environment variables.")
  }

  console.log("Checking if bucket exists:", BUCKET_NAME)

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("Error listing buckets:", listError)
      // Don't throw here - maybe the bucket exists but we can't list it
      console.log("Cannot list buckets, but continuing anyway...")
      return true
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME)
    console.log("Bucket exists:", bucketExists)

    if (!bucketExists) {
      console.log("Attempting to create bucket:", BUCKET_NAME)
      try {
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: false,
          fileSizeLimit: 10485760, // 10MB
        })

        if (createError) {
          console.error("Error creating bucket:", createError)
          // Don't throw - maybe the bucket exists but we can't see it
          console.log("Bucket creation failed, but continuing anyway...")
        } else {
          console.log("Bucket created successfully")
        }
      } catch (createError) {
        console.error("Exception creating bucket:", createError)
        console.log("Bucket creation failed, but continuing anyway...")
      }
    }

    return true
  } catch (error) {
    console.error("Error in initializeStorage:", error)
    // Don't throw - let's try to upload anyway
    console.log("Storage initialization failed, but continuing anyway...")
    return true
  }
}

// Upload Excel file to storage
export async function uploadExcelFile(file: File): Promise<{ success: boolean; message: string }> {
  try {
    if (!canUseSupabase() || !supabase) {
      return {
        success: false,
        message: "Supabase storage is not configured. Please set up your environment variables.",
      }
    }

    console.log("Starting file upload:", { name: file.name, size: file.size })

    // Try to upload directly without worrying about bucket creation
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(DEFAULT_FILE_NAME, file, {
      upsert: true, // Replace if exists
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    if (error) {
      console.error("Supabase upload error:", error)

      // If bucket doesn't exist, provide a helpful message
      if (error.message.includes("bucket") || error.message.includes("not found")) {
        return {
          success: false,
          message: `Storage bucket '${BUCKET_NAME}' doesn't exist. Please create it manually in your Supabase dashboard.`,
        }
      }

      return {
        success: false,
        message: `Upload failed: ${error.message}`,
      }
    }

    console.log("Upload successful:", data)
    return { success: true, message: "Excel file uploaded successfully" }
  } catch (error) {
    console.error("Error in uploadExcelFile:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error uploading file",
    }
  }
}

// Get the current Excel file URL
export async function getExcelFileUrl(): Promise<string | null> {
  try {
    if (!canUseSupabase() || !supabase) {
      return null
    }

    const { data } = await supabase.storage.from(BUCKET_NAME).getPublicUrl(DEFAULT_FILE_NAME)
    return data.publicUrl
  } catch (error) {
    console.error("Error getting Excel file URL:", error)
    return null
  }
}

// Download the current Excel file
export async function downloadCurrentExcel(): Promise<Blob | null> {
  try {
    if (!canUseSupabase() || !supabase) {
      return null
    }

    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(DEFAULT_FILE_NAME)

    if (error || !data) throw error

    return data
  } catch (error) {
    console.error("Error downloading Excel file:", error)
    return null
  }
}

// Read inventory data directly from stored Excel file
export async function readInventoryFromExcel(): Promise<{
  inventory: InventoryItem[]
  packageNote: string
  success: boolean
  message: string
}> {
  try {
    if (!canUseSupabase()) {
      return {
        inventory: [],
        packageNote: "",
        success: false,
        message: "Supabase storage is not configured",
      }
    }

    // Download the file
    const excelBlob = await downloadCurrentExcel()

    if (!excelBlob) {
      return {
        inventory: [],
        packageNote: "",
        success: false,
        message: "No Excel file found in storage",
      }
    }

    // Convert blob to array buffer
    const arrayBuffer = await excelBlob.arrayBuffer()

    // Parse Excel file
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" })

    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[worksheetName]

    // Extract the package note from J1
    const j1Cell = worksheet["J1"]
    const packageNote = j1Cell && j1Cell.v ? j1Cell.v.toString() : ""

    // Get headers from A1-G1
    const expectedColumns = [
      "Part number",
      "MFG Part number",
      "QTY",
      "Part description",
      "Supplier",
      "Location",
      "Package",
    ]

    // Get all data starting from row 2, columns A-G
    const range = worksheet["!ref"]
    if (!range) {
      throw new Error("Excel file appears to be empty")
    }

    const decodedRange = XLSX.utils.decode_range(range)
    const rows: any[] = []

    // Start from row 2 (index 1) and only read columns A-G (0-6)
    for (let row = 1; row <= decodedRange.e.r; row++) {
      const rowData: any = {}
      let hasData = false

      for (let col = 0; col < 7; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = worksheet[cellAddress]
        const columnName = expectedColumns[col]

        if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
          // Convert QTY to number
          if (columnName === "QTY") {
            rowData[columnName] = Number(cell.v) || 0
          } else {
            rowData[columnName] = cell.v.toString()
          }
          hasData = true
        } else {
          rowData[columnName] = columnName === "QTY" ? 0 : ""
        }
      }

      // Only include rows that have at least some data
      if (hasData) {
        rows.push(rowData)
      }
    }

    if (rows.length === 0) {
      throw new Error("No data found in the Excel file")
    }

    // Transform to InventoryItem format
    const inventory: InventoryItem[] = rows.map((row, index) => ({
      id: `item-${index + 1}`,
      "Part number": row["Part number"] || "",
      "MFG Part number": row["MFG Part number"] || "",
      QTY: Number(row["QTY"]) || 0,
      "Part description": row["Part description"] || "",
      Supplier: row["Supplier"] || "",
      Location: row["Location"] || "",
      Package: row["Package"] || "",
      lastUpdated: new Date(),
      reorderPoint: 10, // Default reorder point
    }))

    return {
      inventory,
      packageNote,
      success: true,
      message: `Successfully loaded ${inventory.length} items from Excel file`,
    }
  } catch (error) {
    console.error("Error reading inventory from Excel:", error)
    return {
      inventory: [],
      packageNote: "",
      success: false,
      message: error instanceof Error ? error.message : "Unknown error reading Excel file",
    }
  }
}

// Check if an Excel file exists in storage
export async function excelFileExists(): Promise<boolean> {
  try {
    if (!canUseSupabase() || !supabase) {
      return false
    }

    const { data, error } = await supabase.storage.from(BUCKET_NAME).list()

    if (error) throw error

    return data.some((file) => file.name === DEFAULT_FILE_NAME)
  } catch (error) {
    console.error("Error checking if Excel file exists:", error)
    return false
  }
}

// Get Excel file metadata
export async function getExcelFileMetadata(): Promise<{
  exists: boolean
  lastModified?: Date
  size?: number
  name?: string
}> {
  try {
    if (!canUseSupabase() || !supabase) {
      return { exists: false }
    }

    const { data, error } = await supabase.storage.from(BUCKET_NAME).list()

    if (error) throw error

    const excelFile = data.find((file) => file.name === DEFAULT_FILE_NAME)

    if (!excelFile) {
      return { exists: false }
    }

    return {
      exists: true,
      lastModified: new Date(excelFile.created_at),
      size: excelFile.metadata?.size,
      name: excelFile.name,
    }
  } catch (error) {
    console.error("Error getting Excel file metadata:", error)
    return { exists: false }
  }
}
