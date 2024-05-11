import { ScrapeTask, TaskStatus } from '../../../types';

export const getTaskStatus = ({
  successCount,
  total,
}: {
  successCount: number;
  total: number;
}): ScrapeTask['status'] => {
  if (successCount === total) {
    return TaskStatus.Completed;
  }

  if (successCount > 0) {
    return TaskStatus.Partial;
  }

  return TaskStatus.Failed;
};
