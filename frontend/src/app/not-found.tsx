import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-sm">
        <div className="text-7xl mb-6">🍽️</div>
        <h1 className="font-display font-bold text-4xl text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="font-display text-xl text-gray-700 dark:text-gray-300 mb-4">Page not found</h2>
        <p className="text-gray-500 text-sm mb-8">
          The page you're looking for doesn't exist. If you're a customer, please re-scan the QR code at your table.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/admin" className="btn-primary py-2.5 px-5">
            Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
