const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const SECRET = "mysecretkey";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Create tables
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        user_id INTEGER NOT NULL
      )
    `);

    console.log("Database tables ready");
  } catch (error) {
    console.error("Database error:", error);
  }
};

createTables();

// Test route
app.get("/", (req, res) => {
  res.send("Todo API is running");
});

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, password]
    );

    res.json({
      message: "Registration successful",
    });
  } catch (error) {
    console.error(error);

    res.status(400).json({
      message: "Username already exists",
    });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      SECRET
    );

    res.json({
      token,
      username: user.username,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database error",
    });
  }
});

// Get todos
app.get("/todos", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = jwt.verify(token, SECRET);

    const result = await pool.query(
      "SELECT * FROM todos WHERE user_id = $1",
      [user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(401).json({
      message: "Invalid token",
    });
  }
});

// Add todo
app.post("/todos", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = jwt.verify(token, SECRET);
    const { title } = req.body;

    const result = await pool.query(
      `INSERT INTO todos (title, user_id)
       VALUES ($1, $2)
       RETURNING id, title, user_id`,
      [title, user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database error",
    });
  }
});

// Delete todo
app.delete("/todos/:id", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = jwt.verify(token, SECRET);

    await pool.query(
      "DELETE FROM todos WHERE id = $1 AND user_id = $2",
      [req.params.id, user.id]
    );

    res.json({
      message: "Todo deleted",
    });
  } catch (error) {
    console.error(error);

    res.status(401).json({
      message: "Invalid token",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});