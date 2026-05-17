import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/api';

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/overview');
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {overview?.overview.totalCalls || 0}
              </p>
            </div>
            <div className="text-4xl">📞</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Answered</p>
              <p className="text-3xl font-bold text-green-600">
                {overview?.overview.answeredCalls || 0}
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Missed</p>
              <p className="text-3xl font-bold text-red-600">
                {overview?.overview.missedCalls || 0}
              </p>
            </div>
            <div className="text-4xl">❌</div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Answer Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {overview?.overview.answerRate || 0}%
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Stats
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Avg. Duration</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.floor((overview?.overview.avgDuration || 0) / 60)}m {(overview?.overview.avgDuration || 0) % 60}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">New Clients</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {overview?.overview.newClients || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No recent activity to display.
          </p>
        </div>
      </div>
    </div>
  );
}
