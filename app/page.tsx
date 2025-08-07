"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Package, Settings, AlertTriangle } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management System</h1>
          <p className="text-gray-600">Part Lookup Feature Testing</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Part Lookup Test Card */}
          <Link href="/debug/part-lookup-test">
            <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Part Lookup Test</h3>
                  <p className="text-sm text-gray-600">Test the new scraping feature</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Test part number lookup with real Mouser and Digi-Key scraping.
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  ✓ Ready for Testing
                </span>
              </div>
            </div>
          </Link>

          {/* Add Item Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add Item</h3>
                <p className="text-sm text-gray-600">Add new inventory items</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Add new parts with automatic lookup from suppliers.
            </p>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                ⚠ Temporarily Disabled
              </span>
            </div>
          </div>

          {/* Debug Tools Card */}
          <Link href="/debug">
            <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Debug Tools</h3>
                  <p className="text-sm text-gray-600">System diagnostics</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Access debugging and testing tools.
              </p>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  ✓ Available
                </span>
              </div>
            </div>
          </Link>

        </div>

        {/* Feature Status */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Part Lookup Feature Testing</h3>
              <p className="text-sm text-blue-800 mb-3">
                This is a simplified version of the dashboard focused on testing the new part lookup functionality.
                The full dashboard will be restored after resolving build issues.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-blue-800">Part lookup API with Puppeteer scraping</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-blue-800">Serverless compatibility with fallback scraping</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-blue-800">Real Mouser and Digi-Key integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Test Section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Test</h3>
          <p className="text-sm text-gray-600 mb-4">
            Test the part lookup feature with your Digi-Key part number:
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                336-XG21-RB4195B-ND
              </span>
              <span className="text-sm text-gray-600">← Your test part number</span>
            </div>
            <Link href="/debug/part-lookup-test">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                Test This Part Number →
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
