/**
 * Loading state for dashboard
 */
export default function Loading() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex justify-between">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
