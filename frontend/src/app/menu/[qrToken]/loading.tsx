export default function MenuLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="h-14 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      {/* Category pills */}
      <div className="flex gap-2">
        {[80, 100, 90, 75, 110].map((w, i) => (
          <div key={i} className="h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" style={{ width: w }} />
        ))}
      </div>
      {/* Featured row */}
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-40 h-36 flex-shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      {/* Items */}
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      ))}
    </div>
  );
}
