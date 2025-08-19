"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Package, Plus, RefreshCw, Globe, AlertTriangle, Download, Settings, ExternalLink } from "lucide-react"

interface HelpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const quickHelp = [
    {
      title: "Adding Items",
      icon: <Plus className="h-4 w-4" />,
      content: [
        "Click 'Add Item' button",
        "Enter part number and wait 0.5s for auto-populate",
        "Digi-Key parts: end in -ND, -CT, -TR",
        "Mouser parts: start with numbers",
        "Fill remaining fields and submit",
        "Package auto-suggests: Exact (1-100), Estimated (101-500), Reel (500+)"
      ]
    },
    {
      title: "Auto-Populate",
      icon: <RefreshCw className="h-4 w-4" />,
      content: [
        "Type part number and pause",
        "System searches Digi-Key & Mouser",
        "Auto-fills: MFG Part #, Description, Supplier",
        "Works with: 587-1231-1-ND, 81-EVA86QR7TF472KD1K",
        "Fallback: Creates description if missing"
      ]
    },
    {
      title: "Supplier Lookup",
      icon: <Globe className="h-4 w-4" />,
      content: [
        "Click 'Supplier Lookup' button",
        "Search any part number or description",
        "Compare prices across suppliers",
        "Click 'Select' to auto-fill form",
        "Perfect for price comparison"
      ]
    },
    {
      title: "Reordering",
      icon: <AlertTriangle className="h-4 w-4" />,
      content: [
        "Click 'Reorder' on low stock items",
        "Set quantity, urgency, timeframe",
        "Add your name and notes",
        "Submit sends Slack notification",
        "Tracks with unique request ID"
      ]
    },
    {
      title: "Stock Status",
      icon: <Package className="h-4 w-4" />,
      content: [
        "🔴 Low Stock: At/below reorder point",
        "🟡 Approaching: Within 50% above",
        "⚪ Good Stock: Well above reorder point",
        "Set custom reorder points per item",
        "Weekly automatic alerts"
      ]
    },
    {
      title: "Data Export",
      icon: <Download className="h-4 w-4" />,
      content: [
        "Click 'Download Excel' button",
        "Exports complete inventory",
        "Opens in Excel/Google Sheets",
        "Includes all fields and current data",
        "Use for backups and analysis"
      ]
    }
  ]

  const filteredHelp = quickHelp.filter(item =>
    searchTerm === "" ||
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.some(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quick Help
          </DialogTitle>
          <DialogDescription>
            Quick reference for common tasks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search help topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Quick Help Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHelp.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  {item.icon}
                  {item.title}
                </div>
                <ul className="space-y-1">
                  {item.content.map((line, lineIndex) => (
                    <li key={lineIndex} className="text-xs text-gray-600">
                      • {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Common Issues */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Common Issues</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <strong>Auto-populate not working?</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Wait full 0.5 seconds after typing</li>
                  <li>• Check part number format (-ND for Digi-Key, numbers for Mouser)</li>
                  <li>• Try Supplier Lookup as alternative</li>
                </ul>
              </div>
              <div>
                <strong>Supplier field empty?</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• New suppliers auto-add to dropdown</li>
                  <li>• Refresh page if needed</li>
                  <li>• Use "Add Custom Supplier" option</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/help', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Full Documentation
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
