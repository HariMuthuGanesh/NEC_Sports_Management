const mysql = require("mysql2/promise");
require("dotenv").config();

async function updatePasswords() {
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "SportsDB",
    port: 3306
  });

  const hash = "$2b$10$RsRSt60YZhF8TloXI6IDM.m76kjTmUWUUQn3z8ySRS4hWjutHuHW6";
  await c.query("UPDATE users SET password_hash = ?", [hash]);
  
  console.log("Passwords updated!");
  await c.end();
}

updatePasswords();
