export default function Loading() {
  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Loading environment variables debug...</p>
      </div>
    </div>
  )
}
