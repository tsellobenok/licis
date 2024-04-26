export interface AppConfig {
  liAt?: string;
}

export interface ScrapeFormValues {
  file: File | null;
  getLocations: boolean;
  jobLocation?: string;
  liAt: string;
  timeout: number;
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

export interface JobResult {
  url: string;
  companyName: string;
  title: string;
  description: string;
  location: string;
  whenPosted: string;
  numberOfApplicants: string;
}

export interface ScrapeTask {
  current: number;
  failCount: number;
  failReason?: string;
  jobs?: number;
  status: 'in-progress' | 'completed' | 'partial' | 'failed';
  successCount: number;
  total: number;
}
