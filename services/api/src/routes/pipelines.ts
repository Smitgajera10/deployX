import { FastifyInstance } from "fastify";
import { parsePipeline } from "../utils/pipelineParser";
import fs from "fs";
import { jobQueue } from "../queue/jobQueue";

export async function pipelineRoutes(app: FastifyInstance) {
  app.post("/repos/:repoId/pipelines", async (req, res) => {
    const { repoId } = req.params as { repoId: string };

    // 1️⃣ Read pipeline YAML (for now local file)
    const yamlText = fs.readFileSync(".deployx.yml", "utf8");

    // 2️⃣ Parse steps
    const steps = parsePipeline(yamlText);

    // 3️⃣ Create pipeline
    const pipelineResult = await app.db.query(
      "INSERT INTO pipelines(repo_id, status) VALUES($1,$2) RETURNING *",
      [repoId, "PENDING"]
    );

    const pipeline = pipelineResult.rows[0];

    // 4️⃣ Create jobs + enqueue them
    for (const step of steps) {
      const jobResult = await app.db.query(
        "INSERT INTO jobs(pipeline_id, name, status) VALUES($1,$2,$3) RETURNING *",
        [pipeline.id, step.name, "QUEUED"]
      );
      const job = jobResult.rows[0];

      if (!job) {
        throw new Error("Failed to create job row");
      }

      await jobQueue.add("run-job", {
        jobId: job.id,
        command: step.run,
      });
    }

    return {
      pipelineId: pipeline.id,
      jobsCreated: steps.length
    };
  });
}
