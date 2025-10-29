import { kv } from "@vercel/kv";

export interface Job {
  jobId: string;
  status: "pending" | "crawling" | "completed" | "error";
  progress: { crawled: number; total: number };
  message?: string;
  resultUrl?: string; // URL from Vercel Blob
  site: string;
  target: string;
  limit: number;
  createdAt: number;
  updatedAt: number;
}

export const getJob = async (jobId: string): Promise<Job | null> => {
  try {
    return await kv.get(`job:${jobId}`);
  } catch (error) {
    console.error(`Error getting job ${jobId} from KV:`, error);
    return null;
  }
};

export const createJob = async (
  jobId: string,
  site: string,
  target: string,
  limit: number
): Promise<Job> => {
  const job: Job = {
    jobId,
    site,
    target,
    limit,
    status: "pending",
    progress: { crawled: 0, total: limit },
    message: "Job queued",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await kv.set(`job:${jobId}`, job);
  return job;
};

export const updateJob = async (
  jobId: string,
  update: Partial<Omit<Job, "jobId">>
): Promise<Job | null> => {
  const currentJob = await getJob(jobId);
  if (!currentJob) {
    console.error(`Job ${jobId} not found for update.`);
    return null;
  }
  const updatedJob: Job = {
    ...currentJob,
    ...update,
    updatedAt: Date.now(),
  };
  await kv.set(`job:${jobId}`, updatedJob);
  return updatedJob;
};
