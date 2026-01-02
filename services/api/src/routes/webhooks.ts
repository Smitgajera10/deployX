import { FastifyInstance } from "fastify";
import crypto from "crypto";

export async function webhookRoutes(app: FastifyInstance) {
    // GitHub webhook endpoint
    app.post("/webhooks/github", async (req, res) => {
        const signature = req.headers["x-hub-signature-256"] as string;
        const event = req.headers["x-github-event"] as string;
        const payload = req.body as any;

        // Verify webhook signature if secret is configured
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
        if (webhookSecret && signature) {
            const hmac = crypto.createHmac("sha256", webhookSecret);
            const digest = "sha256=" + hmac.update(JSON.stringify(payload)).digest("hex");

            if (signature !== digest) {
                return res.status(401).send({ error: "Invalid signature" });
            }
        }

        // Handle push events
        if (event === "push") {
            const { repository, ref, after: commitSha, pusher } = payload;
            const gitUrl = repository.clone_url || repository.html_url + ".git";
            const branch = ref.replace("refs/heads/", "");

            // Find repository in database
            const repoResult = await app.db.query(
                "SELECT id FROM repositories WHERE git_url=$1",
                [gitUrl]
            );

            if (!repoResult.rows.length) {
                return res.status(404).send({ error: "Repository not registered in DeployX" });
            }

            const repoId = repoResult.rows[0].id;

            // Check if webhook is active for this repo
            const webhookResult = await app.db.query(
                "SELECT is_active FROM webhooks WHERE repo_id=$1 AND provider='github'",
                [repoId]
            );

            if (webhookResult.rows.length && !webhookResult.rows[0].is_active) {
                return res.status(200).send({ message: "Webhook disabled for this repository" });
            }

            // Trigger pipeline
            try {
                const response = await fetch(`http://localhost:3000/repos/${repoId}/pipelines`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        branch,
                        commitSha,
                        triggeredBy: `github:${pusher.name || pusher.email}`
                    })
                });

                const data = await response.json();

                return res.status(200).send({
                    message: "Pipeline triggered successfully",
                    pipelineId: data.pipelineId
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                app.log.error(`Failed to trigger pipeline: ${errorMessage}`);
                return res.status(500).send({ error: "Failed to trigger pipeline" });
            }
        }

        // Handle ping events
        if (event === "ping") {
            return res.status(200).send({ message: "pong" });
        }

        return res.status(200).send({ message: "Event received but not processed" });
    });

    // GitLab webhook endpoint
    app.post("/webhooks/gitlab", async (req, res) => {
        const token = req.headers["x-gitlab-token"] as string;
        const event = req.headers["x-gitlab-event"] as string;
        const payload = req.body as any;

        if (event === "Push Hook") {
            const { project, ref, checkout_sha: commitSha, user_name } = payload;
            const gitUrl = project.git_http_url;
            const branch = ref.replace("refs/heads/", "");

            const repoResult = await app.db.query(
                "SELECT id FROM repositories WHERE git_url=$1",
                [gitUrl]
            );

            if (!repoResult.rows.length) {
                return res.status(404).send({ error: "Repository not registered" });
            }

            // Similar trigger logic as GitHub
            // ... (implementation similar to GitHub webhook)
        }

        return res.status(200).send({ message: "Event received" });
    });

    // Register webhook for a repository
    app.post("/repos/:repoId/webhooks", async (req, res) => {
        const { repoId } = req.params as { repoId: string };
        const { provider = "github", secret } = req.body as any;

        // Check if webhook already exists
        const existing = await app.db.query(
            "SELECT id FROM webhooks WHERE repo_id=$1 AND provider=$2",
            [repoId, provider]
        );

        if (existing.rows.length) {
            // Update existing webhook
            await app.db.query(
                "UPDATE webhooks SET secret=$1, is_active=true WHERE repo_id=$2 AND provider=$3",
                [secret || null, repoId, provider]
            );
            return { message: "Webhook updated" };
        }

        // Create new webhook
        const result = await app.db.query(
            "INSERT INTO webhooks(repo_id, provider, secret, is_active) VALUES($1, $2, $3, true) RETURNING *",
            [repoId, provider, secret || null]
        );

        return result.rows[0];
    });

    // List webhooks for repository
    app.get("/repos/:repoId/webhooks", async (req, res) => {
        const { repoId } = req.params as { repoId: string };

        const result = await app.db.query(
            "SELECT id, provider, is_active, created_at FROM webhooks WHERE repo_id=$1",
            [repoId]
        );

        return { webhooks: result.rows };
    });

    // Toggle webhook active status
    app.patch("/webhooks/:id", async (req, res) => {
        const { id } = req.params as { id: string };
        const { isActive } = req.body as any;

        const result = await app.db.query(
            "UPDATE webhooks SET is_active=$1 WHERE id=$2 RETURNING *",
            [isActive, id]
        );

        if (!result.rows.length) {
            return res.status(404).send({ error: "Webhook not found" });
        }

        return result.rows[0];
    });
}
