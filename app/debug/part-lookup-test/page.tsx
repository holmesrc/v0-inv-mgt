"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
          <p className="text-muted-foreground">Test the part scraping functionality</p>
        </div>
        <Link href="/debug">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Debug
          </Button>
        </Link>
      </div>

      {/* Manual Test */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Part Lookup</CardTitle>
          <CardDescription>Enter a part number to test the lookup functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="Enter part number (e.g., resistor-100k)"
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => handleLookup()}
                disabled={isLooking || !partNumber.trim()}
              >
                {isLooking ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Lookup
              </Button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <Card className={result.found ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
              <CardContent className="pt-4">
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
                    <div>
                      <strong>Part Number:</strong> {result.partNumber}
                    </div>
                    <div>
                      <strong>MFG Part:</strong> {result.mfgPartNumber}
                    </div>
                    <div className="col-span-2">
                      <strong>Description:</strong> {result.description}
                    </div>
                    <div>
                      <strong>Supplier:</strong> {result.supplier}
                    </div>
                    <div>
                      <strong>Source:</strong> {result.source}
                    </div>
                    {result.price && (
                      <div>
                        <strong>Price:</strong> {result.price}
                      </div>
                    )}
                    {result.availability && (
                      <div>
                        <strong>Availability:</strong> {result.availability}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-orange-700">
                    {result.error || 'Part not found in supplier catalogs'}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Quick Test Parts */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test Parts</CardTitle>
          <CardDescription>Click to test with predefined part numbers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {testParts.map((part) => (
              <Button
                key={part}
                variant="outline"
                size="sm"
                onClick={() => {
                  setPartNumber(part)
                  handleLookup(part)
                }}
                disabled={isLooking}
              >
                {part}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Info */}
      <Card>
        <CardHeader>
          <CardTitle>API Information</CardTitle>
          <CardDescription>Current implementation details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Endpoint:</strong> /api/parts/lookup</div>
            <div><strong>Method:</strong> POST</div>
            <div><strong>Suppliers:</strong> Mouser Electronics, Digi-Key Electronics</div>
            <div><strong>Status:</strong> <Badge variant="secondary">Simulated Data</Badge></div>
            <div className="text-muted-foreground mt-2">
              Currently using simulated data. Real Puppeteer scraping will be implemented next.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
