import { Worker } from "bullmq";
import Redis from "ioredis";
import { exec } from "child_process";
import { Pool } from "pg";
import fs from "fs";
import { ensureRepo } from "./utils/ensureRepo";

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
    const { jobId, pipelineId, repoUrl, command } = job.data;

    console.log(`▶️ Job received: ${jobId}`);
    console.log(`📦 Repo: ${repoUrl}`);
    console.log(`💻 Command: ${command}`);

    const workspace = `/tmp/deployx/${pipelineId}`;

    if (!fs.existsSync(workspace)) {
      fs.mkdirSync(workspace, { recursive: true });
    }

    try {
      await ensureRepo(repoUrl, workspace);
      console.log(`✅ Repository ready at ${workspace}`);
      
      // Verify package.json exists
      const packageJsonPath = `${workspace}/package.json`;
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json not found at ${packageJsonPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Repository setup failed: ${errorMessage}`);
      await db.query(
        "UPDATE jobs SET status=$1, logs=$2 WHERE id=$3",
        ["FAILED", `Repository setup failed: ${errorMessage}`, jobId]
      );
      throw error;
    }

    await db.query(
      "UPDATE jobs SET status=$1 WHERE id=$2",
      ["RUNNING", jobId]
    );

    return new Promise((resolve, reject) => {

      exec(command, {cwd:workspace} , async (err, stdout, stderr) => {
        const logs = stdout + stderr;

        if (err) {
          console.log(`❌ Job FAILED: ${jobId}`);
          await db.query(
            "UPDATE jobs SET status=$1, logs=$2 WHERE id=$3",
            ["FAILED", logs, jobId]
          );
          console.log(err)
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
