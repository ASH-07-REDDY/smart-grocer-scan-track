
import { EnhancedAnalytics } from "@/components/EnhancedAnalytics";

export function AnalyticsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">Comprehensive insights into your pantry inventory</p>
      </div>
      
      <EnhancedAnalytics />
    </div>
  );
}
