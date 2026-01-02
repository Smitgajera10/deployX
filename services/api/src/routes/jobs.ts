import { FastifyInstance } from "fastify";

export async function jobRoutes(app: FastifyInstance) {
    // Get job details
    app.get("/jobs/:id", async (req, res) => {
        const { id } = req.params as { id: string };

        const result = await app.db.query(
            `SELECT j.*, p.id as pipeline_id, p.repo_id, r.name as repo_name
       FROM jobs j
       JOIN pipelines p ON j.pipeline_id = p.id
       JOIN repositories r ON p.repo_id = r.id
       WHERE j.id=$1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).send({ error: "Job not found" });
        }

        return result.rows[0];
    });

    // Retry failed job
    app.post("/jobs/:id/retry", async (req, res) => {
        const { id } = req.params as { id: string };

        const jobResult = await app.db.query(
            "SELECT * FROM jobs WHERE id=$1",
            [id]
        );

        if (!jobResult.rows.length) {
            return res.status(404).send({ error: "Job not found" });
        }

        const job = jobResult.rows[0];

        if (job.status !== "FAILED") {
            return res.status(400).send({ error: "Only failed jobs can be retried" });
        }

        // Reset job status
        await app.db.query(
            "UPDATE jobs SET status=$1, logs=$2 WHERE id=$3",
            ["QUEUED", "", id]
        );

        // Get repo URL
        const repoResult = await app.db.query(
            `SELECT r.git_url FROM repositories r
       JOIN pipelines p ON r.id = p.repo_id
       WHERE p.id=$1`,
            [job.pipeline_id]
        );

        // Re-enqueue job
        const { jobQueue } = await import("../queue/jobQueue");
        await jobQueue.add("run-job", {
            jobId: job.id,
            repoUrl: repoResult.rows[0].git_url,
            command: job.command,
            pipelineId: job.pipeline_id
        });

        return { message: "Job queued for retry" };
    });
}
