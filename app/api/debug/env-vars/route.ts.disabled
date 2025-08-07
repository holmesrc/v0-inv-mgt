import { NextResponse } from "next/server"

export async function GET() {
  // Only show this in development/preview - never in production for security
  const isProduction = process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"

  if (isProduction) {
    return NextResponse.json(
      {
        error: "Environment variable debug not available in production for security",
      },
      { status: 403 },
    )
  }

  // Get all environment variables
  const allEnvVars = process.env
  const envKeys = Object.keys(allEnvVars).sort()

  // Categorize environment variables
  const categories = {
    supabase: envKeys.filter((key) => key.toLowerCase().includes("supabase")),
    slack: envKeys.filter((key) => key.toLowerCase().includes("slack")),
    vercel: envKeys.filter((key) => key.startsWith("VERCEL_")),
    next: envKeys.filter((key) => key.startsWith("NEXT_")),
    custom: envKeys.filter(
      (key) =>
        !key.toLowerCase().includes("supabase") &&
        !key.toLowerCase().includes("slack") &&
        !key.startsWith("VERCEL_") &&
        !key.startsWith("NEXT_") &&
        !key.startsWith("NODE_") &&
        !key.startsWith("npm_") &&
        !key.startsWith("PATH") &&
        !key.startsWith("HOME") &&
        !key.startsWith("USER") &&
        !key.startsWith("SHELL") &&
        !key.startsWith("PWD") &&
        !key.startsWith("LANG") &&
        !key.startsWith("LC_") &&
        !key.startsWith("TERM"),
    ),
    system: envKeys.filter(
      (key) =>
        key.startsWith("NODE_") ||
        key.startsWith("npm_") ||
        key.startsWith("PATH") ||
        key.startsWith("HOME") ||
        key.startsWith("USER") ||
        key.startsWith("SHELL") ||
        key.startsWith("PWD") ||
        key.startsWith("LANG") ||
        key.startsWith("LC_") ||
        key.startsWith("TERM"),
    ),
  }

  // Helper function to safely show environment variable values
  const safeShowValue = (key: string, value: string | undefined) => {
    if (!value) return { exists: false, value: null, length: 0, preview: null }

    // For sensitive variables, only show length and preview
    const sensitiveKeys = ["password", "secret", "key", "token", "webhook"]
    const isSensitive = sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))

    if (isSensitive) {
      return {
        exists: true,
        value: null, // Don't show full value for sensitive vars
        length: value.length,
        preview:
          value.length > 20
            ? `${value.substring(0, 10)}...${value.substring(value.length - 10)}`
            : value.substring(0, 10) + "...",
      }
    } else {
      return {
        exists: true,
        value: value.length > 100 ? value.substring(0, 100) + "..." : value,
        length: value.length,
        preview: value.length > 50 ? value.substring(0, 50) + "..." : value,
      }
    }
  }

  // Build detailed information for each category
  const detailedInfo = {
    supabase: categories.supabase.map((key) => ({
      key,
      ...safeShowValue(key, allEnvVars[key]),
    })),
    slack: categories.slack.map((key) => ({
      key,
      ...safeShowValue(key, allEnvVars[key]),
    })),
    vercel: categories.vercel.map((key) => ({
      key,
      ...safeShowValue(key, allEnvVars[key]),
    })),
    next: categories.next.map((key) => ({
      key,
      ...safeShowValue(key, allEnvVars[key]),
    })),
    custom: categories.custom.map((key) => ({
      key,
      ...safeShowValue(key, allEnvVars[key]),
    })),
    system: categories.system.slice(0, 10).map((key) => ({
      // Limit system vars to first 10
      key,
      ...safeShowValue(key, allEnvVars[key]),
    })),
  }

  // Check for required variables
  const requiredVars = {
    NEXT_PUBLIC_SUPABASE_URL: allEnvVars.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: allEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: allEnvVars.SUPABASE_SERVICE_ROLE_KEY,
    SLACK_WEBHOOK_URL: allEnvVars.SLACK_WEBHOOK_URL,
    UPLOAD_PASSWORD: allEnvVars.UPLOAD_PASSWORD,
    NEXT_PUBLIC_APP_URL: allEnvVars.NEXT_PUBLIC_APP_URL,
  }

  // Validation checks
  const validationResults = {
    supabaseUrl: {
      exists: !!requiredVars.NEXT_PUBLIC_SUPABASE_URL,
      valid: requiredVars.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") || false,
      length: requiredVars.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    },
    supabaseAnonKey: {
      exists: !!requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      valid: (requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0) > 100,
      length: requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    },
    supabaseServiceKey: {
      exists: !!requiredVars.SUPABASE_SERVICE_ROLE_KEY,
      valid: (requiredVars.SUPABASE_SERVICE_ROLE_KEY?.length || 0) > 100,
      length: requiredVars.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    },
    slackWebhook: {
      exists: !!requiredVars.SLACK_WEBHOOK_URL,
      valid: requiredVars.SLACK_WEBHOOK_URL?.startsWith("https://hooks.slack.com/") || false,
      length: requiredVars.SLACK_WEBHOOK_URL?.length || 0,
    },
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    summary: {
      totalVars: envKeys.length,
      supabaseVars: categories.supabase.length,
      slackVars: categories.slack.length,
      vercelVars: categories.vercel.length,
      nextVars: categories.next.length,
      customVars: categories.custom.length,
      systemVars: categories.system.length,
    },
    categories,
    detailedInfo,
    requiredVars: Object.entries(requiredVars).map(([key, value]) => ({
      key,
      ...safeShowValue(key, value),
    })),
    validation: validationResults,
    issues: {
      missingRequired: Object.entries(requiredVars)
        .filter(([key, value]) => !value)
        .map(([key]) => key),
      invalidFormat: Object.entries(validationResults)
        .filter(([key, result]) => result.exists && !result.valid)
        .map(([key]) => key),
    },
  })
}
