const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5000;
const SECRET = "mysecretkey";

const db = new sqlite3.Database("./todo.db");

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      user_id INTEGER NOT NULL
    )
  `);
});

// Register
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    function (error) {
      if (error) {
        return res.status(400).json({
          message: "Username already exists",
        });
      }

      res.json({
        message: "Registration successful",
      });
    }
  );
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (error, user) => {
      if (error) {
        console.log(error);

        return res.status(500).json({
          message: "Database error",
        });
      }

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
    }
  );
});

// Get todos
app.get("/todos", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = jwt.verify(token, SECRET);

    db.all(
      "SELECT * FROM todos WHERE user_id = ?",
      [user.id],
      (error, todos) => {
        if (error) {
          console.log(error);

          return res.status(500).json({
            message: "Database error",
          });
        }

        res.json(todos);
      }
    );
  } catch {
    res.status(401).json({
      message: "Invalid token",
    });
  }
});

// Add todo
app.post("/todos", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = jwt.verify(token, SECRET);
    const { title } = req.body;

    db.run(
      "INSERT INTO todos (title, user_id) VALUES (?, ?)",
      [title, user.id],
      function (error) {
        if (error) {
          console.log(error);

          return res.status(500).json({
            message: "Database error",
          });
        }

        res.json({
          id: this.lastID,
          title,
          user_id: user.id,
        });
      }
    );
  } catch {
    res.status(401).json({
      message: "Invalid token",
    });
  }
});

// Delete todo
app.delete("/todos/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = jwt.verify(token, SECRET);

    db.run(
      "DELETE FROM todos WHERE id = ? AND user_id = ?",
      [req.params.id, user.id],
      (error) => {
        if (error) {
          return res.status(500).json({
            message: "Database error",
          });
        }

        res.json({
          message: "Todo deleted",
        });
      }
    );
  } catch {
    res.status(401).json({
      message: "Invalid token",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});