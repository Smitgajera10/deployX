import { spawn } from "child_process";

export function runCommandStreaming(
    command : string,
    cwd : string,
    onLog : (log : string) => void
): Promise<void> {
    return new Promise((resolve , reject)=>{
        const [cmd , ...args] = command.split(" ");

        const child  = spawn(cmd , args , {cwd});

        child.stdout.on("data" , d => onLog(d.toString()));
        child.stderr.on("data" , d => onLog(d.toString()));

        child.on("close" , code => {
            if(code === 0) resolve();
            else reject(new Error(`Command failed: ${command}`));
        });
    });
}