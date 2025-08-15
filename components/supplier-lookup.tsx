"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, ExternalLink, Copy, Check, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SupplierResult {
  supplier: string
  partNumber: string
  manufacturerPartNumber?: string
  description: string
  price?: number
  availability?: number
  manufacturer?: string
  datasheet?: string
  productUrl?: string
  packageType?: string
}

interface SupplierLookupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPartNumber?: string
  onSelectResult?: (result: SupplierResult) => void
}

export default function SupplierLookup({ open, onOpenChange, initialPartNumber = "", onSelectResult }: SupplierLookupProps) {
  console.log('🔧 SupplierLookup component loaded, open:', open)
  
  const [partNumber, setPartNumber] = useState(initialPartNumber)
  const [results, setResults] = useState<SupplierResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = () => {
    console.log('🔍 handleSearch called with partNumber:', partNumber)
    alert('Search function called! Part: ' + partNumber)
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A'
    return `$${price.toFixed(2)}`
  }

  const formatAvailability = (qty?: number) => {
    if (qty === undefined || qty === null) return 'N/A'
    if (qty === 0) return 'Out of Stock'
    if (qty > 10000) return '10,000+'
    return qty.toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Supplier Lookup</DialogTitle>
          <DialogDescription>
            Search supplier databases for part information and pricing
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter part number (e.g., LM358N, 1N4148, etc.)"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={() => {
                console.log('🔍 Search button clicked!')
                handleSearch()
              }} 
              disabled={loading || !partNumber.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">
                Found {results.length} result{results.length !== 1 ? 's' : ''}
              </h3>
              
              {results.map((result, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Badge variant="outline">{result.supplier}</Badge>
                          <span className="font-mono">{result.partNumber}</span>
                        </CardTitle>
                        {result.manufacturerPartNumber && (
                          <CardDescription className="mt-1">
                            MFG: {result.manufacturerPartNumber}
                            {result.manufacturer && ` by ${result.manufacturer}`}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {result.productUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(result.productUrl, '_blank')}
                            className="h-8 px-2"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {onSelectResult && (
                          <Button
                            size="sm"
                            onClick={() => onSelectResult(result)}
                            className="h-8 px-3"
                          >
                            Use This
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {/* Description */}
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-medium min-w-[80px]">Description:</span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm">{result.description}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(result.description, `desc-${index}`)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedField === `desc-${index}` ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Price and Availability */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Price: </span>
                          <span className={result.price ? "text-green-600 font-medium" : "text-gray-500"}>
                            {formatPrice(result.price)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Stock: </span>
                          <span className={result.availability && result.availability > 0 ? "text-green-600" : "text-red-500"}>
                            {formatAvailability(result.availability)}
                          </span>
                        </div>
                      </div>

                      {/* Package Type */}
                      {result.packageType && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Package:</span>
                          <Badge variant="secondary" className="text-xs">
                            {result.packageType}
                          </Badge>
                        </div>
                      )}

                      {/* Datasheet Link */}
                      {result.datasheet && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Datasheet:</span>
                          <Button
                            size="sm"
                            variant="link"
                            onClick={() => window.open(result.datasheet, '_blank')}
                            className="h-auto p-0 text-blue-600"
                          >
                            View PDF <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results State */}
          {!loading && !error && results.length === 0 && partNumber && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a part number and click search to find supplier information</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
