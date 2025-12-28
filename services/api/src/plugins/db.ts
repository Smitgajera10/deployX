import {Pool} from "pg";

export const db = new Pool({
    host: process.env.DB_HOST || "localhost",
    port : 5432,
    user : "deployx",
    password : "deployx",
    database : "deployx",
    max:10
});


db.on("connect" , ()=>{
    console.log("✅ PostgreSQL connected");
}); 