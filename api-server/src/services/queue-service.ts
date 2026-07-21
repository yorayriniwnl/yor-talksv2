import { Queue, Job } from "bullmq";
import { env } from "../config/env.js";

export class QueueService {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue("defaultQueue", {
      connection: {
        url: env.REDIS_URL,
      },
    });
  }

  async enqueue(type: string, payload: unknown): Promise<Job> {
    return this.queue.add(type, payload);
  }

  /** Removes and returns the next waiting job for administrative/manual processing. */
  async dequeue(): Promise<Job | undefined> {
    const [job] = await this.queue.getJobs(["waiting"], 0, 0, true);
    if (!job) {
      return undefined;
    }
    await job.remove();
    return job;
  }

  async size(): Promise<number> {
    return this.queue.count();
  }

  getQueue(): Queue {
    return this.queue;
  }
}
