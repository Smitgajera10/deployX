import { FastifyInstance } from "fastify";

export async function jobRoutes(app: FastifyInstance) {
    app.get("/jobs/:jobId/logs", async (req, res) => {
        const { jobId } = req.params as { jobId: string };

        const result = await app.db.query(
            "SELECT logs, status FROM jobs WHERE id=$1",
            [jobId]
        );

        if (!result.rows.length) {
            return res.code(404).send({ message: "Job not found" });
        }

        return result.rows[0];
    });

}