import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start gap-3 my-4">
      <ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-semibold text-red-500">Error</h3>
        <p className="text-gray-300">{message}</p>
      </div>
    </div>
  );
}