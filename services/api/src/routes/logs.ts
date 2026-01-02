import { FastifyInstance } from "fastify";

export async function logRoutes(app: FastifyInstance) {
  app.get("/jobs/:jobId/logs", async (req, reply) => {
    const { jobId } = req.params as { jobId: string };

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    let lastLength = 0;

    const interval = setInterval(async () => {
      const result = await app.db.query(
        "SELECT logs, status FROM jobs WHERE id=$1",
        [jobId]
      );

      if (!result.rows.length) return;

      const { logs, status } = result.rows[0];

      if (logs && logs.length > lastLength) {
        const chunk = logs.slice(lastLength);
        reply.raw.write(`data: ${chunk.replace(/\n/g, "\\n")}\n\n`);
        lastLength = logs.length;
      }

      if (status === "SUCCESS" || status === "FAILED") {
        reply.raw.write(`event: end\ndata: ${status}\n\n`);
        clearInterval(interval);
        reply.raw.end();
      }
    }, 500);

    req.raw.on("close", () => {
      clearInterval(interval);
    });
  });
}
