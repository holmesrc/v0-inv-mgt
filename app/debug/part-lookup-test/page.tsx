"use client"

import { useState } from "react"
import { Search, Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PartLookupResult {
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

export default function PartLookupTestPage() {
  const [partNumber, setPartNumber] = useState("")
  const [isLooking, setIsLooking] = useState(false)
  const [result, setResult] = useState<PartLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testParts = [
    "336-XG21-RB4195B-ND",
    "resistor-100k",
    "capacitor-10uf", 
    "ic-555",
    "diode-1n4007",
    "transistor-2n2222",
    "connector-header",
    "unknown-part-xyz"
  ]

  const handleLookup = async (testPartNumber?: string) => {
    const searchPart = testPartNumber || partNumber
    if (!searchPart.trim()) {
      setError("Please enter a part number")
      return
    }

    setIsLooking(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/parts/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partNumber: searchPart.trim()
        })
      })

      const data = await response.json()

      if (data.success && data.data) {
        setResult(data.data)
      } else {
        setError(data.error || 'Failed to lookup part')
      }
    } catch (err) {
      console.error('Lookup error:', err)
      setError('Network error during part lookup')
    } finally {
      setIsLooking(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Part Lookup Test</h1>
          <p className="text-gray-600">Test the part scraping functionality</p>
        </div>
        <Link href="/debug">
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Debug
          </button>
        </Link>
      </div>

      {/* Manual Test */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Manual Part Lookup</h2>
          <p className="text-gray-600">Enter a part number to test the lookup functionality</p>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="partNumber" className="block text-sm font-medium mb-1">Part Number</label>
              <input
                id="partNumber"
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="Enter part number (e.g., 336-XG21-RB4195B-ND)"
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleLookup()}
                disabled={isLooking || !partNumber.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLooking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Lookup
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className={`border rounded-lg p-4 ${result.found ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.found ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-orange-600" />
                )}
                <span className="font-medium">
                  {result.found ? `Found on ${result.source?.toUpperCase()}` : 'Not Found'}
                </span>
              </div>
              
              {result.found ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Part Number:</strong> {result.partNumber}</div>
                  <div><strong>MFG Part:</strong> {result.mfgPartNumber}</div>
                  <div className="col-span-2"><strong>Description:</strong> {result.description}</div>
                  <div><strong>Supplier:</strong> {result.supplier}</div>
                  <div><strong>Source:</strong> {result.source}</div>
                  {result.price && <div><strong>Price:</strong> {result.price}</div>}
                  {result.availability && <div><strong>Availability:</strong> {result.availability}</div>}
                </div>
              ) : (
                <div className="text-sm text-orange-700">
                  {result.error || 'Part not found in supplier catalogs'}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Test Parts */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Quick Test Parts</h2>
          <p className="text-gray-600">Click to test with predefined part numbers</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {testParts.map((part) => (
            <button
              key={part}
              onClick={() => {
                setPartNumber(part)
                handleLookup(part)
              }}
              disabled={isLooking}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {part}
            </button>
          ))}
        </div>
      </div>

      {/* API Info */}
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">API Information</h2>
          <p className="text-gray-600">Current implementation details</p>
        </div>
        <div className="space-y-2 text-sm">
          <div><strong>Endpoint:</strong> /api/parts/lookup</div>
          <div><strong>Method:</strong> POST</div>
          <div><strong>Suppliers:</strong> Mouser Electronics, Digi-Key Electronics</div>
          <div><strong>Environment:</strong> <span className="px-2 py-1 bg-gray-100 rounded text-xs">Serverless Compatible</span></div>
          <div className="text-gray-600 mt-2">
            <strong>Scraping Mode:</strong> Uses real Puppeteer scraping when available, falls back to basic HTML parsing in serverless environments like Vercel.
          </div>
          <div className="text-gray-600">
            <strong>Fallback Behavior:</strong> In serverless mode, performs basic page existence checks and returns generic component information when parts are found.
          </div>
        </div>
      </div>
    </div>
  )
}
