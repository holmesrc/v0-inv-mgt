"use client"

import { ExternalLink, Database, Slack, Settings, Package, AlertTriangle, Search } from "lucide-react"
import Link from "next/link"

export default function DebugPage() {
  const debugEndpoints = [
    {
      name: "Part Lookup Test",
      path: "/debug/part-lookup-test",
      description: "Test part scraping functionality",
      icon: <Search className="w-4 h-4" />,
      category: "Testing"
    }
  ]

  const categories = Array.from(new Set(debugEndpoints.map(endpoint => endpoint.category)))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Debug Endpoints</h1>
          <p className="text-gray-600">System diagnostics and testing tools</p>
        </div>
        <Link href="/">
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            Back to Dashboard
          </button>
        </Link>
      </div>

      <div className="grid gap-6">
        {categories.map(category => (
          <div key={category} className="border rounded-lg p-6 bg-white shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {category === "Testing" && <AlertTriangle className="w-5 h-5" />}
                {category}
              </h2>
              <p className="text-gray-600 text-sm">
                {category === "Testing" && "Comprehensive system testing tools"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {debugEndpoints
                .filter(endpoint => endpoint.category === category)
                .map(endpoint => (
                  <Link key={endpoint.path} href={endpoint.path}>
                    <button className="w-full text-left p-4 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {endpoint.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{endpoint.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {endpoint.description}
                          </div>
                        </div>
                        <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      </div>
                    </button>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800 mb-1">Debug Tools Notice</h3>
            <p className="text-sm text-yellow-700">
              Most debug tools are temporarily disabled during part lookup feature development.
              Only essential testing tools are available.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
