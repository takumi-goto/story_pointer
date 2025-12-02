// Simple in-memory job store for serverless environments
// Note: Jobs will be lost on cold starts, but polling will handle retries

export interface JobState {
  id: string;
  status: "pending" | "processing" | "completed" | "error";
  progress?: string;
  result?: unknown;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

// Use globalThis to persist across hot reloads in Next.js dev mode
const globalForJobs = globalThis as unknown as {
  __jobStore: Map<string, JobState> | undefined;
};

// Global job store (persists across requests in warm instances)
const jobs = globalForJobs.__jobStore ?? new Map<string, JobState>();
globalForJobs.__jobStore = jobs;

// Clean up old jobs (older than 10 minutes)
function cleanupOldJobs() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [id, job] of jobs.entries()) {
    if (now - job.createdAt > maxAge) {
      jobs.delete(id);
    }
  }
}

export function createJob(id: string): JobState {
  cleanupOldJobs();

  const job: JobState = {
    id,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  jobs.set(id, job);
  return job;
}

export function getJob(id: string): JobState | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<JobState>): JobState | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;

  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };

  jobs.set(id, updatedJob);
  return updatedJob;
}

export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
