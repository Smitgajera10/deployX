import { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    db: any;
  }
}

export async function repoRoutes(app:FastifyInstance) {
    app.post("/repos" , async (req , res)=>{
        const {name , gitUrl} = req.body as any;

        const result = await app.db.query(
            "INSERT INTO repositories(name, git_url) VALUES($1,$2) RETURNING *",
            [name, gitUrl]
        )
        return result.rows[0];
    });

}