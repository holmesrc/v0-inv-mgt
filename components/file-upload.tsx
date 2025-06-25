"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import * as XLSX from "xlsx"

interface InventoryItem {
  part_number: string
  quantity: number
  location: string
  package_type: string
  description: string
  supplier: string
}

const FileUpload = () => {
  const [processedData, setProcessedData] = useState<InventoryItem[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add these state variables after the existing state declarations
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingItem: any
    newItem: any
    rowIndex: number
  } | null>(null)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]

    const reader = new FileReader()
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: "array" })

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

      // Transform keys to snake_case and handle empty values
      const transformedData = jsonData.map((item) => {
        const newItem: any = {}
        for (const key in item) {
          if (Object.prototype.hasOwnProperty.call(item, key)) {
            const snakeCaseKey = key.replace(/([A-Z])/g, "_$1").toLowerCase()
            newItem[snakeCaseKey] = item[key] === undefined || item[key] === null ? "" : String(item[key])
          }
        }
        return newItem
      })

      setProcessedData(transformedData)
      setUploadError(null) // Clear any previous errors
    }

    reader.onerror = () => {
      setUploadError("Error reading the file. Please try again.")
    }

    reader.readAsArrayBuffer(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const validateAndSubmit = async () => {
    if (!processedData || processedData.length === 0) {
      setUploadError("No data to submit. Please upload a file.")
      return
    }

    setIsSubmitting(true)
    setUploadError(null)

    // Basic validation - check for empty part numbers
    for (const row of processedData) {
      if (!row.part_number) {
        setUploadError("Part number cannot be empty.")
        setIsSubmitting(false)
        return
      }
    }

    // Add this function to check for duplicates (similar to the single item add)
    const checkForDuplicate = async (partNumber: string, rowIndex: number, newItem: any) => {
      try {
        const response = await fetch("/api/inventory/load-from-db")
        if (response.ok) {
          const data = await response.json()
          const existingItem = data.items?.find(
            (item: any) => item.part_number?.toLowerCase() === partNumber.toLowerCase(),
          )

          if (existingItem) {
            setDuplicateInfo({
              existingItem,
              newItem,
              rowIndex,
            })
            setShowDuplicateDialog(true)
            return true
          }
        }
      } catch (error) {
        console.error("Error checking for duplicates:", error)
      }
      return false
    }

    // In the validation function, replace the duplicate detection logic with:
    for (let i = 0; i < processedData.length; i++) {
      const row = processedData[i]
      if (row.part_number) {
        const isDuplicate = await checkForDuplicate(row.part_number, i, row)
        if (isDuplicate) {
          setIsSubmitting(false)
          return // Stop processing and show the duplicate dialog
        }
      }
    }

    try {
      const response = await fetch("/api/inventory/bulk-add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      })

      if (response.ok) {
        console.log("Bulk inventory added successfully!")
        setProcessedData([]) // Clear the data on success
        alert("Bulk inventory added successfully!")
      } else {
        const errorData = await response.json()
        setUploadError(`Failed to add bulk inventory: ${errorData.message || response.statusText}`)
      }
    } catch (error: any) {
      console.error("Error adding bulk inventory:", error)
      setUploadError(`Error adding bulk inventory: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-500">Drop the files here ...</p>
        ) : (
          <>
            <p className="text-gray-500">Drag 'n' drop some files here, or click to select files</p>
            <p className="text-gray-400">(Only .xlsx files will be accepted)</p>
          </>
        )}
      </div>

      {uploadError && <div className="mt-4 text-red-500">{uploadError}</div>}

      {processedData.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-4 border-b">Part Number</th>
                <th className="py-2 px-4 border-b">Quantity</th>
                <th className="py-2 px-4 border-b">Location</th>
                <th className="py-2 px-4 border-b">Package</th>
                <th className="py-2 px-4 border-b">Description</th>
                <th className="py-2 px-4 border-b">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{item.part_number}</td>
                  <td className="py-2 px-4 border-b">{item.quantity}</td>
                  <td className="py-2 px-4 border-b">{item.location}</td>
                  <td className="py-2 px-4 border-b">{item.package_type}</td>
                  <td className="py-2 px-4 border-b">{item.description}</td>
                  <td className="py-2 px-4 border-b">{item.supplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {processedData.length > 0 && (
        <div className="mt-4">
          <button
            onClick={validateAndSubmit}
            disabled={isSubmitting}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? "Submitting..." : "Add Bulk Inventory"}
          </button>
        </div>
      )}

      {/* Duplicate Detection Dialog */}
      {showDuplicateDialog && duplicateInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-orange-600">Duplicate Part Detected</h3>

            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Existing Part in Inventory:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Part Number:</strong> {duplicateInfo.existingItem.part_number}
                  </div>
                  <div>
                    <strong>Current Quantity:</strong> {duplicateInfo.existingItem.quantity}
                  </div>
                  <div>
                    <strong>Location:</strong> {duplicateInfo.existingItem.location}
                  </div>
                  <div>
                    <strong>Package:</strong> {duplicateInfo.existingItem.package_type}
                  </div>
                  <div>
                    <strong>Description:</strong> {duplicateInfo.existingItem.description}
                  </div>
                  <div>
                    <strong>Supplier:</strong> {duplicateInfo.existingItem.supplier}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">New Part Being Added:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Part Number:</strong> {duplicateInfo.newItem.part_number}
                  </div>
                  <div>
                    <strong>Quantity to Add:</strong>
                    <input
                      type="number"
                      className="ml-2 w-20 px-2 py-1 border rounded"
                      defaultValue={duplicateInfo.newItem.quantity}
                      onChange={(e) => {
                        const updatedData = [...processedData]
                        updatedData[duplicateInfo.rowIndex].quantity = Number.parseInt(e.target.value) || 0
                        setProcessedData(updatedData)
                      }}
                    />
                  </div>
                  <div>
                    <strong>Location:</strong> {duplicateInfo.newItem.location}
                  </div>
                  <div>
                    <strong>Package:</strong> {duplicateInfo.newItem.package_type}
                  </div>
                  <div>
                    <strong>Description:</strong> {duplicateInfo.newItem.description}
                  </div>
                  <div>
                    <strong>Supplier:</strong> {duplicateInfo.newItem.supplier}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  // Remove the duplicate item from the batch
                  const updatedData = processedData.filter((_, index) => index !== duplicateInfo.rowIndex)
                  setProcessedData(updatedData)
                  setShowDuplicateDialog(false)
                  setDuplicateInfo(null)
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Remove from Batch
              </button>
              <button
                onClick={() => {
                  setShowDuplicateDialog(false)
                  setDuplicateInfo(null)
                  // Continue with the batch processing
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Keep Both & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload
