import fs from "fs";
import path from "path";

export function createWorkspace(jobId: string) {
  const baseDir = "/tmp/deployx";
  const jobDir = path.join(baseDir, jobId);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir);
  }

  fs.mkdirSync(jobDir);

  return jobDir;
}
