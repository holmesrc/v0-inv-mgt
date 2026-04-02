import { type NextRequest } from "next/server"

/**
 * Extract lab_id from request query params.
 * All API routes should call this to get the lab scope.
 */
export function getLabId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get("lab_id")
}
