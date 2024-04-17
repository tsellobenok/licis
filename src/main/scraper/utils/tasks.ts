import { ScrapeTask } from '../../../types';

export const getTaskStatus = ({
  successCount,
  total,
}: {
  successCount: number;
  total: number;
}): ScrapeTask['status'] => {
  if (successCount === total) {
    return 'completed';
  }

  if (successCount > 0) {
    return 'partial';
  }

  return 'failed';
};
