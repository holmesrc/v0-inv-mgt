"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

export default function DebugCronPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const triggerCron = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🔧 Triggering cron job manually...')
      
      const response = await fetch('/api/alerts/cron', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer debug-manual-trigger`,
          'User-Agent': 'debug-page-manual-test'
        }
      })

      console.log('📡 Response status:', response.status)
      
      const data = await response.json()
      console.log('📡 Response data:', data)

      if (response.ok) {
        setResult(data)
      } else {
        setError(`HTTP ${response.status}: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('❌ Error triggering cron:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const testSlackDirect = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🔧 Testing Slack directly...')
      
      const response = await fetch('/api/slack/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: "🧪 Test message from debug page at " + new Date().toLocaleString(),
          channel: "#inventory-alerts"
        })
      })

      const data = await response.json()
      console.log('📡 Slack test response:', data)

      if (response.ok) {
        setResult({ ...data, type: 'slack_test' })
      } else {
        setError(`Slack test failed: ${data.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('❌ Error testing Slack:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cron Job Debug Console</h1>
        <p className="text-gray-600 mt-2">
          Manually trigger and test the low stock alert system
        </p>
      </div>

      <div className="grid gap-6">
        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Manual Triggers
            </CardTitle>
            <CardDescription>
              Test the alert system components individually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={triggerCron}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Trigger Full Alert System
              </Button>
              
              <Button 
                variant="outline"
                onClick={testSlackDirect}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Test Slack Only
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              <p><strong>Full Alert System:</strong> Loads inventory, checks low stock, sends Slack alert</p>
              <p><strong>Slack Only:</strong> Sends a simple test message to verify Slack integration</p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Result
                {result.type === 'slack_test' && (
                  <Badge variant="outline">Slack Test</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.success && (
                  <div className="text-green-600 font-medium">
                    ✅ {result.message}
                  </div>
                )}
                
                {result.itemsCount !== undefined && (
                  <div>
                    <strong>Low Stock Items Found:</strong> {result.itemsCount}
                  </div>
                )}
                
                {result.timestamp && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Executed at: {result.timestamp}</span>
                  </div>
                )}
                
                {result.items && result.items.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Sample Low Stock Items:</h4>
                    <div className="space-y-2">
                      {result.items.slice(0, 5).map((item: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                          <div className="font-medium">{item.partNumber}</div>
                          <div className="text-gray-600">{item.description}</div>
                          <div className="text-red-600">
                            Current: {item.currentQty} | Reorder at: {item.reorderPoint}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    View Raw Response
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current Cron Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Schedule:</strong> 30 13 * * * (1:30 PM UTC daily)</p>
              <p><strong>Your Time:</strong> 9:30 AM EST / 8:30 AM EDT</p>
              <p><strong>Next Run:</strong> Tomorrow at 9:30 AM EST</p>
              <p className="text-gray-600 mt-4">
                Use this page to test the system manually. If both tests work here, 
                the automatic cron should work too.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
