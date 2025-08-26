'use client'

import { useState } from 'react'

export default function DebugCronPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const triggerCron = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/cron/weekly-alert', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer dst-inventory-alerts-2025-holmesrc`,
          'User-Agent': 'debug-page'
        }
      })
      
      const data = await response.json()
      setResult({
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  const triggerTestCron = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/cron/test', {
        method: 'GET'
      })
      
      const data = await response.json()
      setResult({
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">🔧 Cron Job Debug Page</h1>
      
      <div className="space-y-4 mb-8">
        <button
          onClick={triggerCron}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
        >
          {loading ? 'Running...' : '🚀 Trigger Weekly Alert Cron'}
        </button>
        
        <button
          onClick={triggerTestCron}
          disabled={loading}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? 'Running...' : '🧪 Trigger Test Cron'}
        </button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Current time: {new Date().toLocaleString()} ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </p>
        <p className="text-sm text-gray-600">
          UTC time: {new Date().toISOString()}
        </p>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">📊 Result:</h2>
          <pre className="bg-black text-green-400 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">ℹ️ Debug Info:</h3>
        <ul className="text-sm space-y-1">
          <li>• Weekly Alert Cron: Calls the same endpoint as automatic cron</li>
          <li>• Test Cron: Simple test endpoint with no dependencies</li>
          <li>• Check Slack for messages after triggering Weekly Alert</li>
          <li>• Results show the API response and timing</li>
        </ul>
      </div>
    </div>
  )
}
