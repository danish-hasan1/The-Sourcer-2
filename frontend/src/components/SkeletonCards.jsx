export default function SkeletonCards() {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`bg-white rounded-xl border border-gray-100 p-3.5 animate-fade-up delay-${i+1}`}>
          <div className="flex items-start gap-3 mb-3">
            <div className="skeleton w-9 h-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3.5 w-32 rounded" />
              <div className="skeleton h-3 w-48 rounded" />
            </div>
            <div className="skeleton w-8 h-8 rounded-lg" />
          </div>
          <div className="flex gap-1.5 mb-3">
            {[48, 56, 44, 52].map(w => (
              <div key={w} className={`skeleton h-4 rounded-full`} style={{ width: w }} />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-4 w-20 rounded-full" />
            <div className="skeleton h-4 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
