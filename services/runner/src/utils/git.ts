import { exec } from "child_process";

export function cloneRepo(repoUrl: string , dest : string):Promise<void> {
    return new Promise((resolve , reject)=>{
        exec(`git clone ${repoUrl} .` , {cwd:dest} , (err)=>{
            if (err) reject(err);
            else resolve();
        });
    });
}