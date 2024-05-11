export enum ScrapeTaskType {
  CompanyInfo = 'company-info',
  CompanyJobs = 'company-jobs',
}

export enum TaskStatus {
  InProgress = 'in-progress',
  Completed = 'completed',
  Partial = 'partial',
  Failed = 'failed',
}

export interface Account {
  avatar?: string;
  email?: string;
  id: string;
  liAt: string | null;
  name: string;
  password?: string;
  selected: boolean;
  type: 'auto' | 'manual';
}

export interface AccountCredentials {
  email: string;
  liAt: string;
  password: string;
}

export interface AppConfig {
  accounts?: Account[];
  getLocations?: boolean;
  jobLocation?: string;
  raiseTheHood: boolean;
}

export interface ScrapeProps {
  timeout: number;
  type?: ScrapeTaskType;
  urls: string[];
}

export interface JobResult {
  companyName: string;
  description: string;
  location: string;
  numberOfApplicants: string;
  title: string;
  url: string;
  whenPosted: string;
}

export interface ScrapeTask {
  current: number;
  endTime: number | null;
  failCount: number;
  failReason?: string;
  id: string;
  jobs?: number;
  status: TaskStatus;
  successCount: number;
  total: number;
  type: ScrapeTaskType;
}
