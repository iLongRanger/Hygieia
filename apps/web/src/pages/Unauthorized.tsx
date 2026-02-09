import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 dark:bg-surface-900">
      <div className="w-full max-w-md rounded-xl border border-surface-200 bg-white p-8 text-center shadow-sm dark:border-surface-700 dark:bg-surface-800">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">
          Access Denied
        </h1>
        <p className="mt-3 text-sm text-surface-600 dark:text-surface-300">
          Your account does not have permission to view this page.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
