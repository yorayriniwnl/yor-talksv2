import { Queue } from "bullmq";
import { env } from "../config/env.js";
export class QueueService {
    queue;
    constructor() {
        this.queue = new Queue("defaultQueue", {
            connection: {
                url: env.REDIS_URL,
            },
        });
    }
    async enqueue(type, payload) {
        return this.queue.add(type, payload);
    }
    async size() {
        return this.queue.count();
    }
    getQueue() {
        return this.queue;
    }
}
//# sourceMappingURL=queue-service.js.map