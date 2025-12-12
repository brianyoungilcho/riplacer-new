import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import type { ResearchJob } from '@/hooks/useDiscoverySession';

interface ResearchProgressProps {
  jobs: ResearchJob[];
  progress: number;
  className?: string;
}

export function ResearchProgress({ jobs, progress, className }: ResearchProgressProps) {
  const completedCount = jobs.filter(j => j.status === 'complete').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const runningCount = jobs.filter(j => j.status === 'running').length;
  const queuedCount = jobs.filter(j => j.status === 'queued').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'complete': return 'Complete';
      case 'failed': return 'Failed';
      case 'running': return 'Researching...';
      default: return 'Queued';
    }
  };

  if (jobs.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Research Progress</h3>
        <span className="text-sm text-gray-500">
          {completedCount}/{jobs.length} complete
        </span>
      </div>

      <Progress value={progress} className="h-2 mb-4" />

      <div className="flex items-center gap-4 text-xs text-gray-500">
        {runningCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
            <span>{runningCount} researching</span>
          </div>
        )}
        {queuedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{queuedCount} queued</span>
          </div>
        )}
        {completedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>{completedCount} done</span>
          </div>
        )}
        {failedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            <span>{failedCount} failed</span>
          </div>
        )}
      </div>

      {/* Detailed job list (collapsed by default) */}
      {jobs.length <= 5 && (
        <div className="mt-4 space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-2 text-sm"
            >
              {getStatusIcon(job.status)}
              <span className="text-gray-700 flex-1 truncate">
                {job.prospectKey?.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) || job.type}
              </span>
              <span className="text-xs text-gray-400">
                {getStatusLabel(job.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
