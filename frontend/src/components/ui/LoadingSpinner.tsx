// src/components/ui/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  title?: string;
}

export default function LoadingSpinner({ title }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="spinner"></div>
      {title && <p className="mt-4 text-gray-400">{title}</p>}
    </div>
  );
}