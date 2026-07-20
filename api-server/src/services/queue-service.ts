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

  async size(): Promise<number> {
    return this.queue.count();
  }

  getQueue(): Queue {
    return this.queue;
  }
}
