import { Worker } from "bullmq";
import Redis from "ioredis";
import { exec } from "child_process";
import { Pool } from "pg";

const redis = new Redis({ host: process.env.REDIS_HOST || "localhost", port: 6379,maxRetriesPerRequest: null });

const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: "deployx",
  password: "deployx",
  database: "deployx"
});

new Worker(
  "deployx-jobs",
  async job => {
    const { jobId, command } = job.data;

    console.log(`▶️ Job received: ${jobId}`);
    console.log(`💻 Command: ${command}`);

    await db.query(
      "UPDATE jobs SET status=$1 WHERE id=$2",
      ["RUNNING", jobId]
    );

    const dockerCmd = `docker run --rm node:18 sh -c "${command}"`;

    return new Promise((resolve, reject) => {

      exec(dockerCmd, async (err, stdout, stderr) => {
        const logs = stdout + stderr;

        if (err) {
          console.log(`❌ Job FAILED: ${jobId}`);
          await db.query(
            "UPDATE jobs SET status=$1, logs=$2 WHERE id=$3",
            ["FAILED", logs, jobId]
          );
          return reject(err);
        }

        
        console.log(`✅ Job SUCCESS: ${jobId}`);
        await db.query(
          "UPDATE jobs SET status=$1, logs=$2 WHERE id=$3",
          ["SUCCESS", logs, jobId]
        );

        resolve(true);
      });
    });
  },
  { connection: redis }
);
