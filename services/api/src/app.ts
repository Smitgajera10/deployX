import Fastify from "fastify";
import { healthRoutes } from "./routes/health";
import { db } from "./plugins/db";
import { redis } from "./plugins/redis";
import { repoRoutes } from "./routes/repos";
import { pipelineRoutes } from "./routes/pipelines";
import { jobRoutes } from "./routes/jobs";

export function buildApp() {
  const app = Fastify({
    logger: true
  });
  app.decorate("db" , db);
  app.decorate("redis", redis);
  
  
  app.register(healthRoutes);
  app.register(repoRoutes);
  app.register(pipelineRoutes);
  app.register(jobRoutes);


  return app;
}
