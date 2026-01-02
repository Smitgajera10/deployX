import Fastify from "fastify";
import { healthRoutes } from "./routes/health";
import { db } from "./plugins/db";
import { redis } from "./plugins/redis";
import { repoRoutes } from "./routes/repos";
import { pipelineRoutes } from "./routes/pipelines";
import { logRoutes } from "./routes/logs";
import { jobRoutes } from "./routes/jobs";
import { webhookRoutes } from "./routes/webhooks";

export function buildApp() {
  const app = Fastify({
    logger: true
  });
  app.decorate("db", db);
  app.decorate("redis", redis);


  app.register(healthRoutes);
  app.register(repoRoutes);
  app.register(pipelineRoutes);
  app.register(jobRoutes);
  app.register(logRoutes);
  app.register(webhookRoutes);


  return app;
}
