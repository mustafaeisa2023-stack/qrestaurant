'use client';

export default function MenuError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 text-center">
      <div>
        <div className="text-6xl mb-4">😔</div>
        <h2 className="font-display font-bold text-xl mb-2 text-gray-900 dark:text-white">
          Something went wrong
        </h2>
        <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
          We couldn't load the menu. Please check your connection or re-scan the QR code.
        </p>
        <button
          onClick={reset}
          className="btn-primary py-2.5 px-6"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
