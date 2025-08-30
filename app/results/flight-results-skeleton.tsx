interface FlightResultsSkeletonProps {
  count?: number
}

export default function FlightResultsSkeleton({ count = 2 }: FlightResultsSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-lg bg-white p-4 h-[172px]">
          <div className="grid grid-cols-12 gap-4">
            {/* Flight numbers skeleton - matches actual height */}
            <div className="col-span-2">
              <div className="h-5 w-20 rounded bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
              </div>
              <div className="mt-2 h-4 w-16 rounded bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <div className="mt-1 h-3 w-12 rounded bg-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>

            {/* Flight times and duration skeleton - matches actual layout */}
            <div className="col-span-6">
              <div className="grid grid-cols-3 items-center">
                <div>
                  <div className="h-8 w-16 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <div className="mt-1 h-5 w-12 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.7s' }}></div>
                  </div>
                  <div className="mt-1 h-3 w-16 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.2s' }}></div>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="h-4 w-20 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                  <div className="mt-2 h-[1px] w-full bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.8s' }}></div>
                  </div>
                  <div className="mt-2 h-4 w-12 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.3s' }}></div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="h-8 w-16 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <div className="mt-1 h-5 w-12 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.9s' }}></div>
                  </div>
                  <div className="mt-1 h-3 w-16 rounded bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing skeleton - matches actual pricing section height */}
            <div className="col-span-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center rounded p-2 h-[120px]">
                <div className="h-4 w-16 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.1s' }}></div>
                </div>
                <div className="mt-4 h-3 w-12 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.6s' }}></div>
                </div>
                <div className="mt-1 h-6 w-20 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.1s' }}></div>
                </div>
                <div className="mt-2 h-3 w-16 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.6s' }}></div>
                </div>
                <div className="mt-2 h-1 w-full rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.8s' }}></div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded p-2 h-[120px]">
                <div className="h-4 w-16 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.15s' }}></div>
                </div>
                <div className="mt-4 h-3 w-12 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '0.65s' }}></div>
                </div>
                <div className="mt-1 h-6 w-20 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.15s' }}></div>
                </div>
                <div className="mt-2 h-3 w-16 rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.65s' }}></div>
                </div>
                <div className="mt-2 h-1 w-full rounded bg-gray-200 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animationDelay: '1.85s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}
