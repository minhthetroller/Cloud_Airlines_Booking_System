export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9fa] to-white">
      {/* Header skeleton */}
      <div className="container mx-auto px-4 py-8">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-[180px] animate-pulse bg-gray-200"></div>
          </div>
          <nav className="hidden md:block">
            <ul className="flex gap-6">
              {[1, 2, 3, 4].map((i) => (
                <li key={i}>
                  <div className="h-4 w-20 animate-pulse bg-gray-200"></div>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-4">
            <div className="hidden h-4 w-16 animate-pulse bg-gray-200 md:block"></div>
            <div className="h-10 w-24 animate-pulse rounded-full bg-gray-300"></div>
          </div>
        </header>
      </div>

      {/* Booking form skeleton */}
      <section className="mb-12 w-full bg-[#0f2d3c] py-8">
        <div className="container mx-auto px-4">
          <div className="mb-2 h-8 w-48 animate-pulse bg-gray-200"></div>
          <div className="mb-6 h-4 w-72 animate-pulse bg-gray-200"></div>
          <div className="h-[300px] animate-pulse rounded-lg bg-gray-200"></div>
        </div>
      </section>

      {/* Content skeleton */}
      <div className="container mx-auto px-4">
        <section className="mb-12 grid gap-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-3 h-6 w-32 animate-pulse bg-gray-200"></div>
              <div className="mb-4 h-16 animate-pulse bg-gray-200"></div>
              <div className="h-4 w-24 animate-pulse bg-gray-200"></div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
