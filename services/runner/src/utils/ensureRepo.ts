import { exec } from "child_process";
import fs from "fs";
import path from "path";

export function ensureRepo(repoUrl: string, workspace: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const gitDir = path.join(workspace, ".git");

    // Repo already exists → pull
    if (fs.existsSync(gitDir)) {
      exec("git pull", { cwd: workspace }, (err, stdout, stderr) => {
        if (err) {
          console.error("Git pull failed:", stderr);
          return reject(err);
        }
        console.log("🔄 Repository updated");
        resolve();
      });
      return;
    }

    // Fresh clone
    exec(`git clone ${repoUrl} .`, { cwd: workspace }, (err, stdout, stderr) => {
      if (err) {
        console.error("Git clone failed:", stderr);
        return reject(err);
      }
      console.log("📥 Repository cloned");
      resolve();
    });
  });
}
