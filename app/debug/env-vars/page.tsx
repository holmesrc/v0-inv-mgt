"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Database,
  MessageSquare,
  Settings,
  Globe,
  Code,
  Monitor,
} from "lucide-react"

interface EnvVarInfo {
  key: string
  exists: boolean
  value: string | null
  length: number
  preview: string | null
}

interface ValidationResult {
  exists: boolean
  valid: boolean
  length: number
}

interface EnvDebugData {
  timestamp: string
  environment: {
    NODE_ENV: string
    VERCEL_ENV: string
    VERCEL_URL: string
  }
  summary: {
    totalVars: number
    supabaseVars: number
    slackVars: number
    vercelVars: number
    nextVars: number
    customVars: number
    systemVars: number
  }
  categories: {
    supabase: string[]
    slack: string[]
    vercel: string[]
    next: string[]
    custom: string[]
    system: string[]
  }
  detailedInfo: {
    supabase: EnvVarInfo[]
    slack: EnvVarInfo[]
    vercel: EnvVarInfo[]
    next: EnvVarInfo[]
    custom: EnvVarInfo[]
    system: EnvVarInfo[]
  }
  requiredVars: EnvVarInfo[]
  validation: {
    supabaseUrl: ValidationResult
    supabaseAnonKey: ValidationResult
    supabaseServiceKey: ValidationResult
    slackWebhook: ValidationResult
  }
  issues: {
    missingRequired: string[]
    invalidFormat: string[]
  }
}

export default function EnvVarsDebugPage() {
  const [data, setData] = useState<EnvDebugData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSensitive, setShowSensitive] = useState(false)

  const loadEnvVars = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/env-vars")
      const result = await response.json()

      if (response.ok) {
        setData(result)
      } else {
        setError(result.error || "Failed to load environment variables")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEnvVars()
  }, [])

  const getStatusIcon = (exists: boolean, valid?: boolean) => {
    if (!exists) return <XCircle className="w-4 h-4 text-red-500" />
    if (valid === false) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "supabase":
        return <Database className="w-4 h-4" />
      case "slack":
        return <MessageSquare className="w-4 h-4" />
      case "vercel":
        return <Globe className="w-4 h-4" />
      case "next":
        return <Code className="w-4 h-4" />
      case "custom":
        return <Settings className="w-4 h-4" />
      case "system":
        return <Monitor className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const renderEnvVarList = (vars: EnvVarInfo[], category: string) => (
    <div className="space-y-2">
      {vars.length === 0 ? (
        <p className="text-sm text-muted-foreground">No {category} environment variables found</p>
      ) : (
        vars.map((envVar) => (
          <div key={envVar.key} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(envVar.exists)}
                <span className="font-medium text-sm">{envVar.key}</span>
                <Badge variant="outline">{envVar.length} chars</Badge>
              </div>
            </div>

            {envVar.exists && (
              <div className="text-xs space-y-1">
                <div className="font-mono bg-gray-100 p-2 rounded break-all">
                  {showSensitive && envVar.value ? envVar.value : envVar.preview}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading environment variables...</p>
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
        <Button onClick={loadEnvVars}>Load Environment Variables</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Environment Variables Debug</h1>
          <p className="text-muted-foreground">
            Comprehensive view of all environment variables (Last updated: {new Date(data.timestamp).toLocaleString()})
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSensitive(!showSensitive)} variant="outline" size="sm">
            {showSensitive ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showSensitive ? "Hide" : "Show"} Sensitive
          </Button>
          <Button onClick={loadEnvVars} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Current Environment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="font-medium">NODE_ENV:</span>
              <Badge variant="outline" className="ml-2">
                {data.environment.NODE_ENV}
              </Badge>
            </div>
            <div>
              <span className="font-medium">VERCEL_ENV:</span>
              <Badge variant="outline" className="ml-2">
                {data.environment.VERCEL_ENV || "Not set"}
              </Badge>
            </div>
            <div>
              <span className="font-medium">VERCEL_URL:</span>
              <Badge variant="outline" className="ml-2">
                {data.environment.VERCEL_URL || "Not set"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues Alert */}
      {(data.issues.missingRequired.length > 0 || data.issues.invalidFormat.length > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              {data.issues.missingRequired.length > 0 && (
                <div>
                  <strong>Missing Required Variables:</strong> {data.issues.missingRequired.join(", ")}
                </div>
              )}
              {data.issues.invalidFormat.length > 0 && (
                <div>
                  <strong>Invalid Format:</strong> {data.issues.invalidFormat.join(", ")}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{data.summary.totalVars}</div>
              <div className="text-sm text-muted-foreground">Total Variables</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.summary.supabaseVars}</div>
              <div className="text-sm text-muted-foreground">Supabase</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{data.summary.slackVars}</div>
              <div className="text-sm text-muted-foreground">Slack</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.summary.vercelVars}</div>
              <div className="text-sm text-muted-foreground">Vercel</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{data.summary.nextVars}</div>
              <div className="text-sm text-muted-foreground">Next.js</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{data.summary.customVars}</div>
              <div className="text-sm text-muted-foreground">Custom</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Variables Validation */}
      <Card>
        <CardHeader>
          <CardTitle>Required Variables Validation</CardTitle>
          <CardDescription>Critical environment variables needed for the application to function</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.requiredVars.map((envVar) => {
              const validation =
                data.validation[envVar.key.toLowerCase().replace(/[^a-z]/g, "") as keyof typeof data.validation]
              return (
                <div key={envVar.key} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(envVar.exists, validation?.valid)}
                    <span className="font-medium">{envVar.key}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{envVar.length} chars</Badge>
                    {envVar.exists && validation && (
                      <Badge variant={validation.valid ? "default" : "destructive"}>
                        {validation.valid ? "Valid" : "Invalid Format"}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Categorized Variables */}
      <Card>
        <CardHeader>
          <CardTitle>All Environment Variables</CardTitle>
          <CardDescription>Organized by category</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="supabase" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              {Object.entries(data.detailedInfo).map(([category, vars]) => (
                <TabsTrigger key={category} value={category} className="flex items-center gap-1">
                  {getCategoryIcon(category)}
                  <span className="capitalize">{category}</span>
                  <Badge variant="secondary" className="ml-1">
                    {vars.length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(data.detailedInfo).map(([category, vars]) => (
              <TabsContent key={category} value={category}>
                {renderEnvVarList(vars, category)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
