export interface AppConfig {
  liAt?: string;
}

export interface ScrapeFormValues {
  file: File | null;
  liAt: string;
  timeout: number;
  getLocations: boolean;
  type: 'company-info' | 'company-jobs';
}

export interface ScrapeProps {
  getJobs: boolean;
  getLocations: boolean;
  liAt: string;
  timeout: number;
  type?: 'company-info';
  urls: string[];
}

export interface ScrapeTask {
  current: number;
  failCount: number;
  failReason?: string;
  status: 'in-progress' | 'completed' | 'partial' | 'failed';
  successCount: number;
  total: number;
}
