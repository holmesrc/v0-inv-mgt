"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface DebugResult {
  success: boolean
  data?: {
    mfgPartNumber: string
    description: string
    supplier: string
    found: boolean
    source?: string
  }
  error?: string
  message?: string
  timing?: number
}

export default function DebugPartLookup() {
  const [partNumber, setPartNumber] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [searchHistory, setSearchHistory] = useState<Array<{partNumber: string, result: DebugResult, timestamp: Date}>>([])

  const handleSearch = async () => {
    if (!partNumber.trim()) return

    setIsSearching(true)
    setResult(null)
    
    const startTime = Date.now()
    
    try {
      console.log(`🔍 DEBUG: Starting search for "${partNumber}"`)
      
      const response = await fetch('/api/part-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ partNumber: partNumber.trim() }),
      })

      const data = await response.json()
      const timing = Date.now() - startTime
      
      const debugResult: DebugResult = {
        ...data,
        timing
      }
      
      console.log(`🔍 DEBUG: Search completed in ${timing}ms`, debugResult)
      
      setResult(debugResult)
      setSearchHistory(prev => [{
        partNumber: partNumber.trim(),
        result: debugResult,
        timestamp: new Date()
      }, ...prev.slice(0, 9)]) // Keep last 10 searches
      
    } catch (error) {
      console.error('🔍 DEBUG: Search failed', error)
      const errorResult: DebugResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: Date.now() - startTime
      }
      setResult(errorResult)
    } finally {
      setIsSearching(false)
    }
  }

  const getStatusIcon = (result: DebugResult) => {
    if (result.success && result.data?.found) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (result.success && !result.data?.found) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
  }

  const getStatusColor = (result: DebugResult) => {
    if (result.success && result.data?.found) return "bg-green-50 border-green-200"
    if (result.success && !result.data?.found) return "bg-yellow-50 border-yellow-200"
    return "bg-red-50 border-red-200"
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🔍 Part Lookup Debug Tool</h1>
        <p className="text-muted-foreground">
          Test part number lookups and see detailed results from Digikey and Mouser scraping
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Part Number</CardTitle>
          <CardDescription>
            Enter any part number to test the lookup functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="partNumber">Part Number</Label>
              <Input
                id="partNumber"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g., TC2050-IDC-ND, 595-TL072CP, LM358"
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !partNumber.trim()}
                className="min-w-[120px]"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Result */}
      {result && (
        <Card className={`mb-6 ${getStatusColor(result)}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(result)}
              Search Result for "{partNumber}"
            </CardTitle>
            <CardDescription>
              Completed in {result.timing}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">API Response</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Success:</span> 
                    <Badge variant={result.success ? "default" : "destructive"} className="ml-2">
                      {result.success ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {result.data && (
                    <>
                      <div>
                        <span className="font-medium">Found:</span> 
                        <Badge variant={result.data.found ? "default" : "secondary"} className="ml-2">
                          {result.data.found ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Source:</span> 
                        <Badge variant="outline" className="ml-2">
                          {result.data.source || "Unknown"}
                        </Badge>
                      </div>
                    </>
                  )}
                  {result.error && (
                    <div>
                      <span className="font-medium text-red-600">Error:</span> 
                      <span className="ml-2 text-red-600">{result.error}</span>
                    </div>
                  )}
                  {result.message && (
                    <div>
                      <span className="font-medium">Message:</span> 
                      <span className="ml-2">{result.message}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {result.data && result.data.found && (
                <div>
                  <h4 className="font-semibold mb-2">Part Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">MFG Part Number:</span>
                      <div className="mt-1 p-2 bg-white rounded border">
                        {result.data.mfgPartNumber || <span className="text-gray-400">Not found</span>}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Description:</span>
                      <div className="mt-1 p-2 bg-white rounded border">
                        {result.data.description || <span className="text-gray-400">Not found</span>}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Supplier:</span>
                      <div className="mt-1 p-2 bg-white rounded border">
                        {result.data.supplier || <span className="text-gray-400">Not found</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search History</CardTitle>
            <CardDescription>
              Recent searches (last 10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchHistory.map((item, index) => (
                <div key={index} className={`p-3 rounded border ${getStatusColor(item.result)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.result)}
                      <span className="font-medium">{item.partNumber}</span>
                      {item.result.data?.source && (
                        <Badge variant="outline" className="text-xs">
                          {item.result.data.source}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()} ({item.result.timing}ms)
                    </div>
                  </div>
                  {item.result.data?.found && (
                    <div className="text-xs text-muted-foreground">
                      {item.result.data.mfgPartNumber && `MFG: ${item.result.data.mfgPartNumber} • `}
                      {item.result.data.description && `${item.result.data.description.substring(0, 60)}...`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-700">
          <ol className="list-decimal list-inside space-y-1">
            <li>Enter a part number from Digikey or Mouser</li>
            <li>Click Search to test the lookup functionality</li>
            <li>Check the results to see what data was found</li>
            <li>Look at the Source field to see which site returned the data</li>
            <li>Verify the MFG Part Number, Description, and Supplier are correct</li>
          </ol>
          <div className="mt-3 p-2 bg-blue-100 rounded">
            <strong>Example parts to test:</strong><br/>
            • TC2050-IDC-ND (Digikey cable)<br/>
            • 568-4109-1-ND (Digikey MCU)<br/>
            • 595-TL072CP (Mouser op-amp)<br/>
            • LM358 (Generic part)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
