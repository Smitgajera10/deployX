import { FastifyInstance } from "fastify";
import { parsePipeline } from "../utils/pipelineParser";
import fs from "fs";
import { jobQueue } from "../queue/jobQueue";

export async function pipelineRoutes(app: FastifyInstance) {
  // Create and trigger pipeline
  app.post("/repos/:repoId/pipelines", async (req, res) => {
    const { repoId } = req.params as { repoId: string };
    const { branch, commitSha, triggeredBy } = req.body as any;

    // 1️⃣ Read pipeline YAML (for now local file)
    const yamlText = fs.readFileSync(".deployx.yml", "utf8");

    // 2️⃣ Parse steps
    const steps = parsePipeline(yamlText);

    // 3️⃣ Create pipeline
    const pipelineResult = await app.db.query(
      "INSERT INTO pipelines(repo_id, status, branch, commit_sha, triggered_by) VALUES($1, $2, $3, $4, $5) RETURNING *",
      [repoId, "PENDING", branch || "main", commitSha || null, triggeredBy || "manual"]
    );

    const pipeline = pipelineResult.rows[0];

    const repoResult = await app.db.query(
      "SELECT git_url FROM repositories WHERE id=$1",
      [repoId]
    );

    if (!repoResult.rows.length) {
      throw new Error("Repository not found");
    }

    const repoUrl = repoResult.rows[0].git_url;

    // Update pipeline status to RUNNING
    await app.db.query(
      "UPDATE pipelines SET status=$1 WHERE id=$2",
      ["RUNNING", pipeline.id]
    );

    // 4️⃣ Create jobs + enqueue them
    for (const step of steps) {
      const jobResult = await app.db.query(
        "INSERT INTO jobs(pipeline_id, name, status, command) VALUES($1, $2, $3, $4) RETURNING *",
        [pipeline.id, step.name, "QUEUED", step.run]
      );
      const job = jobResult.rows[0];

      if (!job) {
        throw new Error("Failed to create job row");
      }

      await jobQueue.add("run-job", {
        jobId: job.id,
        repoUrl,
        command: step.run,
        pipelineId: pipeline.id
      });
    }

    return {
      pipelineId: pipeline.id,
      jobsCreated: steps.length,
      status: "RUNNING"
    };
  });

  // List all pipelines (with optional repo filter)
  app.get("/pipelines", async (req, res) => {
    const { repoId, status, limit = 50 } = req.query as any;

    let query = `
      SELECT p.*, r.name as repo_name, r.git_url 
      FROM pipelines p
      JOIN repositories r ON p.repo_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (repoId) {
      params.push(repoId);
      query += ` AND p.repo_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length}`;

    const result = await app.db.query(query, params);

    return {
      pipelines: result.rows,
      total: result.rows.length
    };
  });

  // Get pipeline details with jobs
  app.get("/pipelines/:id", async (req, res) => {
    const { id } = req.params as { id: string };

    const pipelineResult = await app.db.query(
      `SELECT p.*, r.name as repo_name, r.git_url 
       FROM pipelines p
       JOIN repositories r ON p.repo_id = r.id
       WHERE p.id=$1`,
      [id]
    );

    if (!pipelineResult.rows.length) {
      return res.status(404).send({ error: "Pipeline not found" });
    }

    const jobsResult = await app.db.query(
      "SELECT * FROM jobs WHERE pipeline_id=$1 ORDER BY created_at",
      [id]
    );

    return {
      pipeline: pipelineResult.rows[0],
      jobs: jobsResult.rows
    };
  });

  // Cancel pipeline
  app.post("/pipelines/:id/cancel", async (req, res) => {
    const { id } = req.params as { id: string };

    await app.db.query(
      "UPDATE pipelines SET status=$1 WHERE id=$2",
      ["CANCELLED", id]
    );

    await app.db.query(
      "UPDATE jobs SET status=$1 WHERE pipeline_id=$2 AND status IN ('QUEUED', 'RUNNING')",
      ["CANCELLED", id]
    );

    return { message: "Pipeline cancelled" };
  });
}
