import { Worker } from "bullmq";
import Redis from "ioredis";
import { exec } from "child_process";
import { Pool } from "pg";
import fs from "fs";
import { ensureRepo } from "./utils/ensureRepo";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: 6379,
  maxRetriesPerRequest: null
});

const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: 5432,
  user: "deployx",
  password: "deployx",
  database: "deployx"
});

async function updatePipelineStatus(pipelineId: number) {
  // Get all jobs for this pipeline
  const jobsResult = await db.query(
    "SELECT status FROM jobs WHERE pipeline_id=$1",
    [pipelineId]
  );

  const jobs = jobsResult.rows;
  const allComplete = jobs.every(j => ["SUCCESS", "FAILED", "CANCELLED"].includes(j.status));

  if (allComplete) {
    const hasFailures = jobs.some(j => j.status === "FAILED");
    const pipelineStatus = hasFailures ? "FAILED" : "SUCCESS";

    await db.query(
      "UPDATE pipelines SET status=$1, completed_at=NOW() WHERE id=$2",
      [pipelineStatus, pipelineId]
    );

    console.log(`✅ Pipeline ${pipelineId} completed with status: ${pipelineStatus}`);
  }
}

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

      // Verify package.json exists (or skip for non-Node projects)
      const packageJsonPath = `${workspace}/package.json`;
      if (!fs.existsSync(packageJsonPath) && command.includes("npm")) {
        console.warn(`⚠️ Warning: package.json not found, but npm command detected`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Repository setup failed: ${errorMessage}`);
      await db.query(
        "UPDATE jobs SET status=$1, logs=$2 WHERE id=$3",
        ["FAILED", `Repository setup failed: ${errorMessage}`, jobId]
      );
      await updatePipelineStatus(pipelineId);
      throw error;
    }

    // Update job to RUNNING
    await db.query(
      "UPDATE jobs SET status=$1, started_at=NOW() WHERE id=$2",
      ["RUNNING", jobId]
    );

    return new Promise((resolve, reject) => {
      exec(command, { cwd: workspace }, async (err, stdout, stderr) => {
        const logs = stdout + stderr;

        if (err) {
          console.log(`❌ Job FAILED: ${jobId}`);
          await db.query(
            "UPDATE jobs SET status=$1, logs=$2, completed_at=NOW() WHERE id=$3",
            ["FAILED", logs, jobId]
          );
          console.log(err);
          await updatePipelineStatus(pipelineId);
          return reject(err);
        }

        console.log(`✅ Job SUCCESS: ${jobId}`);
        await db.query(
          "UPDATE jobs SET status=$1, logs=$2, completed_at=NOW() WHERE id=$3",
          ["SUCCESS", logs, jobId]
        );

        await updatePipelineStatus(pipelineId);
        resolve(true);
      });
    });
  },
  {
    connection: redis,
    concurrency: Number(process.env.RUNNER_CONCURRENCY || 2)
  }
);

console.log("🚀 DeployX Runner started and waiting for jobs...");
