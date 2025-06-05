import { put, list } from "@vercel/blob"

// Function to upload Excel file to blob storage
export async function uploadExcelToBlob(file: File): Promise<string> {
  try {
    const { url } = await put(`inventory-excel/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    // Store the latest URL in localStorage for quick access
    localStorage.setItem("excelBlobUrl", url)

    return url
  } catch (error) {
    console.error("Error uploading file to blob storage:", error)
    throw error
  }
}

// Function to get the latest Excel file from blob storage
export async function getLatestExcelUrl(): Promise<string | null> {
  try {
    // First check localStorage for performance
    const cachedUrl = localStorage.getItem("excelBlobUrl")
    if (cachedUrl) {
      return cachedUrl
    }

    // If not in localStorage, fetch from blob storage
    const { blobs } = await list({ prefix: "inventory-excel/" })

    // Sort by created date (newest first)
    const sortedBlobs = blobs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

    if (sortedBlobs.length > 0) {
      const latestUrl = sortedBlobs[0].url
      localStorage.setItem("excelBlobUrl", latestUrl)
      return latestUrl
    }

    return null
  } catch (error) {
    console.error("Error getting latest Excel URL:", error)
    return null
  }
}

// Function to download file from URL
export async function downloadFileFromUrl(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }
  return await response.blob()
}
