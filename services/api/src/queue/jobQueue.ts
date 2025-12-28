import { Queue } from "bullmq";
import Redis from "ioredis"


const connection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: 6379
});

export const jobQueue = new Queue("deployx-jobs", {
  connection
});