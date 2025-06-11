
import { AlertCircle } from "lucide-react";

interface ValidationErrorsProps {
  errors: string[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-1">
        <AlertCircle className="w-4 h-4" />
        Please fix the following errors:
      </div>
      <ul className="text-red-700 text-sm space-y-1">
        {errors.map((error, index) => (
          <li key={index} className="ml-2">• {error}</li>
        ))}
      </ul>
    </div>
  );
}
