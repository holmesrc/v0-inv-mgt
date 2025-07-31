"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Info, Clock } from "lucide-react"

interface EnvHistoryData {
  timestamp: string
  runtime: Record<string, string | undefined>
  environmentType: Record<string, boolean>
  envVarAccess: Record<string, number | boolean>
  criticalVars: Record<string, { exists: boolean; source: string; length: number }>
  clientSideAccess: { note: string; nextPublicVarsCount: number }
  diagnostics: Record<string, boolean>
  possibleReasons: string[]
}

export default function EnvHistoryPage() {
  const [data, setData] = useState<EnvHistoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/env-history")
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        setError("Failed to load environment history")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Analyzing environment history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Button onClick={loadData}>Analyze Environment History</Button>
      </div>
    )
  }

  const getCurrentEnvironmentType = () => {
    if (data.environmentType.isV0Preview) return { type: "v0 Preview", color: "blue" }
    if (data.environmentType.isProduction) return { type: "Production", color: "green" }
    if (data.environmentType.isVercelPreview) return { type: "Vercel Preview", color: "yellow" }
    if (data.environmentType.isDevelopment) return { type: "Development", color: "purple" }
    return { type: "Unknown", color: "gray" }
  }

  const currentEnv = getCurrentEnvironmentType()

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Environment History Analysis</h1>
          <p className="text-muted-foreground">Understanding why environment variable access changed</p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {/* Current Environment Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Current Environment Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Environment Type:</span>
              <Badge variant="outline" className={`border-${currentEnv.color}-500 text-${currentEnv.color}-700`}>
                {currentEnv.type}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {Object.entries(data.environmentType).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  {value ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className={value ? "font-medium" : "text-muted-foreground"}>
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variable Access */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variable Access</CardTitle>
          <CardDescription>Current state of environment variable availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.envVarAccess.totalEnvVars}</div>
              <div className="text-sm text-muted-foreground">Total Env Vars</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.clientSideAccess.nextPublicVarsCount}</div>
              <div className="text-sm text-muted-foreground">NEXT_PUBLIC Vars</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.values(data.criticalVars).filter((v) => v.exists).length}
              </div>
              <div className="text-sm text-muted-foreground">Critical Vars Found</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {Object.entries(data.envVarAccess).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                </span>
                <div className="flex items-center gap-2">
                  {typeof value === "boolean" ? (
                    value ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )
                  ) : (
                    <Badge variant="outline">{value}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical Variables Status */}
      <Card>
        <CardHeader>
          <CardTitle>Critical Variables Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.criticalVars).map(([key, info]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {info.exists ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">{key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{info.length} chars</Badge>
                  <Badge variant={info.exists ? "default" : "destructive"}>{info.source}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Results */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(data.diagnostics).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                {value ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className={value ? "font-medium" : "text-muted-foreground"}>
                  {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Possible Reasons for Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Why Environment Variables Worked Before
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.possibleReasons.map((reason, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm">{reason}</p>
              </div>
            ))}
          </div>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Most Likely Explanation:</strong> You were previously testing in a Vercel preview deployment (when
              you push to GitHub, Vercel creates preview deployments with environment variables). Now you're in the pure
              v0 preview environment which is isolated and doesn't have access to your Vercel environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Runtime Information */}
      <Card>
        <CardHeader>
          <CardTitle>Runtime Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(data.runtime).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="font-medium">{key}:</span>
                <span className="text-muted-foreground">{value || "Not set"}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
