"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, AlertCircle, Database, Download } from "lucide-react"
import { parseExcelFile } from "@/lib/excel-parser"

interface FileUploadProps {
  onDataLoaded: (data: any[], packageNote: string) => void
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleChooseFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleUpload = useCallback(async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setUploadSuccess(null)

    try {
      // First, try to parse the file locally
      const { data, packageNote } = await parseExcelFile(file)

      // Then, upload the file to storage (if not in preview mode)
      const formData = new FormData()
      formData.append("file", file)

      try {
        const response = await fetch("/api/excel", {
          method: "POST",
          body: formData,
        })

        if (response.ok) {
          const result = await response.json()
          setUploadSuccess(`File uploaded successfully! ${result.inventoryCount} items stored permanently.`)
        } else {
          // If API fails, still use the parsed data
          setUploadSuccess(`File parsed successfully! ${data.length} items loaded for preview.`)
        }
      } catch (apiError) {
        // If API fails, still use the parsed data
        setUploadSuccess(`File parsed successfully! ${data.length} items loaded for preview.`)
      }

      // Pass the data to the parent component
      onDataLoaded(data, packageNote)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process file"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [file, onDataLoaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (
      droppedFile &&
      (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))
    ) {
      setFile(droppedFile)
      setError(null)
    } else {
      setError("Please upload a CSV or Excel file")
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const loadSampleData = () => {
    const sampleData = [
      {
        "Part number": "490-12158-ND",
        "MFG Part number": "C0805C5R1J5GACTU",
        QTY: 100,
        "Part description": "CAP CER 5.1PF 50V C0G/NP0 0805",
        Supplier: "Digi-Key",
        Location: "H1-1",
        Package: "0805",
      },
      {
        "Part number": "311-1.00KCRCT-ND",
        "MFG Part number": "RC0805FR-071KL",
        QTY: 50,
        "Part description": "RES SMD 1K OHM 1% 1/8W 0805",
        Supplier: "Digi-Key",
        Location: "H1-2",
        Package: "0805",
      },
      {
        "Part number": "160-1169-1-ND",
        "MFG Part number": "LTST-C170KRKT",
        QTY: 25,
        "Part description": "LED RED CLEAR 2V 0805 SMD",
        Supplier: "Digi-Key",
        Location: "H1-3",
        Package: "0805",
      },
      {
        "Part number": "445-2176-1-ND",
        "MFG Part number": "GRM188R71H104KA93D",
        QTY: 200,
        "Part description": "CAP CER 0.1UF 50V X7R 0603",
        Supplier: "Digi-Key",
        Location: "H1-4",
        Package: "0603",
      },
      {
        "Part number": "RMCF0805JT10K0CT-ND",
        "MFG Part number": "RMCF0805JT10K0",
        QTY: 75,
        "Part description": "RES SMD 10K OHM 5% 1/8W 0805",
        Supplier: "Digi-Key",
        Location: "H1-5",
        Package: "0805",
      },
      {
        "Part number": "BC847BPN-ND",
        "MFG Part number": "BC847B",
        QTY: 30,
        "Part description": "TRANS NPN 45V 0.1A SOT23",
        Supplier: "Digi-Key",
        Location: "H2-1",
        Package: "SOT-23",
      },
      {
        "Part number": "1276-1000-1-ND",
        "MFG Part number": "CL10A105KB8NNNC",
        QTY: 150,
        "Part description": "CAP CER 1UF 50V X7R 0603",
        Supplier: "Digi-Key",
        Location: "H2-2",
        Package: "0603",
      },
    ]

    onDataLoaded(sampleData, "Sample inventory data for testing the system - includes various components")
    setUploadSuccess("Sample data loaded successfully! 7 items ready for testing.")
  }

  const downloadSampleCSV = () => {
    const csvContent = `Part number,MFG Part number,QTY,Part description,Supplier,Location,Package
"490-12158-ND","C0805C5R1J5GACTU",100,"CAP CER 5.1PF 50V C0G/NP0 0805","Digi-Key","H1-1","0805"
"311-1.00KCRCT-ND","RC0805FR-071KL",50,"RES SMD 1K OHM 1% 1/8W 0805","Digi-Key","H1-2","0805"
"160-1169-1-ND","LTST-C170KRKT",25,"LED RED CLEAR 2V 0805 SMD","Digi-Key","H1-3","0805"
"445-2176-1-ND","GRM188R71H104KA93D",200,"CAP CER 0.1UF 50V X7R 0603","Digi-Key","H1-4","0603"
"RMCF0805JT10K0CT-ND","RMCF0805JT10K0",75,"RES SMD 10K OHM 5% 1/8W 0805","Digi-Key","H1-5","0805"`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "sample_inventory.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Inventory Management System</h1>
          <p className="text-lg text-gray-600">Upload your file or use sample data to get started</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Upload Your Inventory File
            </CardTitle>
            <CardDescription>
              Upload CSV files in preview, or Excel files in the deployed version. Expected columns: Part number, MFG
              Part number, QTY, Part description, Supplier, Location, Package
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-lg text-gray-600">Drag and drop your file here</p>
                <p className="text-sm text-gray-500">CSV files work in preview, Excel files work in deployed version</p>
              </div>
            </div>

            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="text-center space-y-2">
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleChooseFileClick}>
                  Choose File
                </Button>
                <Button variant="outline" onClick={downloadSampleCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>
              <div className="text-sm text-gray-500">or</div>
              <Button variant="secondary" onClick={loadSampleData}>
                Load Sample Data
              </Button>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-blue-900">{file.name}</span>
                    <p className="text-xs text-blue-600">({(file.size / 1024).toFixed(1)} KB)</p>
                  </div>
                </div>
                <Button onClick={handleUpload} disabled={loading}>
                  {loading ? "Processing..." : "Upload & Process"}
                </Button>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <Database className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{uploadSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Expected File Format:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  <strong>CSV Format (Preview):</strong>
                </p>
                <p>• Header row: Part number, MFG Part number, QTY, Part description, Supplier, Location, Package</p>
                <p>• Data rows with comma-separated values</p>
                <p className="mt-2">
                  <strong>Excel Format (Deployed):</strong>
                </p>
                <p>• Column A: Part number</p>
                <p>• Column B: MFG Part number</p>
                <p>• Column C: QTY</p>
                <p>• Column D: Part description</p>
                <p>• Column E: Supplier</p>
                <p>• Column F: Location</p>
                <p>• Column G: Package</p>
                <p className="text-xs text-gray-500 mt-2">Note: Cell J1 can contain package sorting information</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">Environment Information</h3>
                  <p className="text-sm text-blue-700">
                    <strong>Preview:</strong> Supports CSV files and sample data for testing
                    <br />
                    <strong>Deployed:</strong> Full Excel support at{" "}
                    <a
                      href="https://v0-inv-mgt.vercel.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      v0-inv-mgt.vercel.app
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
