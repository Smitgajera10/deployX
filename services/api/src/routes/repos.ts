import { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    db: any;
  }
}

export async function repoRoutes(app: FastifyInstance) {
  // Create repository
  app.post("/repos", async (req, res) => {
    const { name, gitUrl, description } = req.body as any;

    const result = await app.db.query(
      "INSERT INTO repositories(name, git_url, description) VALUES($1, $2, $3) RETURNING *",
      [name, gitUrl, description || null]
    );
    return result.rows[0];
  });

  // List all repositories
  app.get("/repos", async (req, res) => {
    const result = await app.db.query(
      "SELECT * FROM repositories ORDER BY created_at DESC"
    );
    return {
      repositories: result.rows,
      total: result.rows.length
    };
  });

  // Get repository by ID
  app.get("/repos/:id", async (req, res) => {
    const { id } = req.params as { id: string };

    const result = await app.db.query(
      "SELECT * FROM repositories WHERE id=$1",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).send({ error: "Repository not found" });
    }

    // Get pipeline stats for this repo
    const statsResult = await app.db.query(
      `SELECT 
        COUNT(*) as total_pipelines,
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'RUNNING' THEN 1 END) as running
       FROM pipelines WHERE repo_id=$1`,
      [id]
    );

    return {
      repository: result.rows[0],
      stats: statsResult.rows[0]
    };
  });

  // Delete repository
  app.delete("/repos/:id", async (req, res) => {
    const { id } = req.params as { id: string };

    const result = await app.db.query(
      "DELETE FROM repositories WHERE id=$1 RETURNING *",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).send({ error: "Repository not found" });
    }

    return { message: "Repository deleted successfully" };
  });
}