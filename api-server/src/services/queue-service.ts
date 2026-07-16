type Job = { id: string; type: string; payload: unknown; createdAt: string };

export class QueueService {
  private readonly jobs: Job[] = [];

  enqueue(type: string, payload: unknown): Job {
    const job = { id: `${Date.now()}-${this.jobs.length}`, type, payload, createdAt: new Date().toISOString() };
    this.jobs.push(job);
    return job;
  }

  dequeue(): Job | undefined {
    return this.jobs.shift();
  }

  size(): number {
    return this.jobs.length;
  }
}
