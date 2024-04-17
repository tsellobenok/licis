export interface AppConfig {
  liAt?: string;
}

export interface ScrapeFormValues {
  file: File | null;
  liAt: string;
  timeout: number;
}

export interface ScrapeProps {
  liAt: string;
  timeout: number;
  urls: string[];
  type?: 'company-info';
}

export interface ScrapeTask {
  current: number;
  failCount: number;
  failReason?: string;
  status: 'in-progress' | 'completed' | 'partial' | 'failed';
  successCount: number;
  total: number;
}
