/**
 * Loading state for diff page
 */
export default function Loading() {
  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>

        {/* Diff content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File list skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>

          {/* Diff viewer skeleton */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-1">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
