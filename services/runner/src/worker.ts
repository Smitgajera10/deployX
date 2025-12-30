import { Worker } from "bullmq";
import Redis from "ioredis";
import { exec } from "child_process";
import { Pool } from "pg";
import fs from "fs";
import { ensureRepo } from "./utils/ensureRepo";

const redis = new Redis({ host: process.env.REDIS_HOST || "localhost", port: 6379,maxRetriesPerRequest: null });

const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  user: "deployx",
  password: "deployx",
  database: "deployx"
});

async function appendLog(jobId: string, log: string) {
  await db.query(
    "UPDATE jobs SET logs = COALESCE(logs,'') || $1 WHERE id=$2",
    [log, jobId]
  );
}


new Worker(
  "deployx-jobs",
  async job => {

    if (job.name === "pipeline") {
      console.log("🚀 Pipeline started:", job.data.pipelineId);
      return;
    }
    const { jobId, pipelineId, repoUrl, command } = job.data;

    console.log(`▶️ Job received: ${jobId}`);
    console.log(`📦 Repo: ${repoUrl}`);
    console.log(`💻 Command: ${command}`);

    const workspace = `/tmp/deployx/${pipelineId}`;

    if (!fs.existsSync(workspace)) {
      fs.mkdirSync(workspace, { recursive: true });
    }

    await db.query(
      "UPDATE jobs SET status=$1 WHERE id=$2",
      ["RUNNING", jobId]
    );
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


    return new Promise((resolve, reject) => {

      exec(command, {cwd:workspace , timeout: 1000 * 60 * 10} , async (err, stdout, stderr) => {
        if (stdout) await appendLog(jobId, stdout);
        if (stderr) await appendLog(jobId, stderr);


        if (err) {
          console.log(`❌ Job FAILED: ${jobId}`);
          await db.query(
            "UPDATE jobs SET status=$1 WHERE id=$2",
            ["FAILED", jobId]
          );
          console.log(err)
          return reject(err);
        }

        
        console.log(`✅ Job SUCCESS: ${jobId}`);
        await db.query(
          "UPDATE jobs SET status=$1 WHERE id=$2",
          ["SUCCESS", jobId]
        );

        const remaining = await db.query(
          "SELECT COUNT(*) FROM jobs WHERE pipeline_id=$1 AND status IN ('QUEUED','RUNNING')",
          [pipelineId]
        );

        if (Number(remaining.rows[0].count) === 0) {
          const failed = await db.query(
            "SELECT COUNT(*) FROM jobs WHERE pipeline_id=$1 AND status='FAILED'",
            [pipelineId]
          );

          const finalStatus = Number(failed.rows[0].count) > 0 ? "FAILED" : "SUCCESS";

          await db.query(
            "UPDATE pipelines SET status=$1 WHERE id=$2",
            [finalStatus, pipelineId]
          );
        }


        resolve(true);
      });
    });
  },
  { 
    connection: redis,
    concurrency: Number(process.env.RUNNER_CONCURRENCY || 2)
  }
);
