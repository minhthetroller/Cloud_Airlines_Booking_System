export default function FlightResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((item) => (
        <div key={item} className="overflow-hidden rounded-lg bg-white p-4">
          <div className="grid animate-pulse grid-cols-12 gap-4">
            {/* Flight numbers skeleton */}
            <div className="col-span-2">
              <div className="h-5 w-20 rounded bg-gray-200"></div>
              <div className="mt-2 h-5 w-20 rounded bg-gray-200"></div>
              <div className="mt-2 h-4 w-24 rounded bg-gray-200"></div>
            </div>

            {/* Flight times and duration skeleton */}
            <div className="col-span-6">
              <div className="grid grid-cols-3">
                <div>
                  <div className="h-8 w-16 rounded bg-gray-200"></div>
                  <div className="mt-1 h-6 w-12 rounded bg-gray-200"></div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="h-4 w-24 rounded bg-gray-200"></div>
                  <div className="mt-2 h-[1px] w-full bg-gray-200"></div>
                  <div className="mt-2 h-4 w-12 rounded bg-gray-200"></div>
                  <div className="mt-2 flex w-full justify-between">
                    <div className="h-3 w-10 rounded bg-gray-200"></div>
                    <div className="h-3 w-10 rounded bg-gray-200"></div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="h-8 w-16 rounded bg-gray-200"></div>
                  <div className="mt-1 h-6 w-12 rounded bg-gray-200"></div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3">
                <div className="flex justify-center">
                  <div className="h-3 w-20 rounded bg-gray-200"></div>
                </div>
                <div></div>
                <div className="flex justify-center">
                  <div className="h-3 w-20 rounded bg-gray-200"></div>
                </div>
              </div>

              <div className="mt-2">
                <div className="h-3 w-32 rounded bg-gray-200"></div>
              </div>
            </div>

            {/* Pricing skeleton */}
            <div className="col-span-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <div className="h-5 w-20 rounded bg-gray-200"></div>
                <div className="mt-4 h-3 w-16 rounded bg-gray-200"></div>
                <div className="mt-1 h-6 w-24 rounded bg-gray-200"></div>
                <div className="mt-2 h-1 w-full rounded bg-gray-200"></div>
              </div>

              <div className="flex flex-col items-center">
                <div className="h-5 w-20 rounded bg-gray-200"></div>
                <div className="mt-4 h-3 w-16 rounded bg-gray-200"></div>
                <div className="mt-1 h-6 w-24 rounded bg-gray-200"></div>
                <div className="mt-2 h-1 w-full rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
