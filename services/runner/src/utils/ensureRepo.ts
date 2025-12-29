import { exec } from "child_process";
import fs from "fs";
import path from "path";

export function ensureRepo(repoUrl: string, workspace: string): Promise<void> {
  if (fs.existsSync(path.join(workspace, ".git"))) {
    return Promise.resolve(); // already cloned
  }

  return new Promise((resolve, reject) => {
    exec(`git clone ${repoUrl} .`, { cwd: workspace, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error(`Git clone failed: ${stderr || err.message}`);
        reject(err);
      } else {
        console.log(`Repository cloned successfully to ${workspace}`);
        resolve();
      }
    });
  });
}

