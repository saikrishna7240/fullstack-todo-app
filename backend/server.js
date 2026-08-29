const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const SECRET = process.env.JWT_SECRET || "mysecretkey";

/* =========================
   DATABASE
========================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

/* =========================
   DATABASE INITIALIZATION
========================= */

const initializeDatabase = async () => {
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

    await pool.query(`
      ALTER TABLE todos
      ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium'
    `);

    await pool.query(`
      ALTER TABLE todos
      ADD COLUMN IF NOT EXISTS due_time TIMESTAMP
    `);

    await pool.query(`
      ALTER TABLE todos
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Yet to Do'
    `);

    /* Fix old todos */

    await pool.query(`
      UPDATE todos
      SET priority = 'Medium'
      WHERE priority IS NULL
    `);

    await pool.query(`
      UPDATE todos
      SET status = 'Yet to Do'
      WHERE status IS NULL
    `);

    console.log("Database tables ready");
  } catch (error) {
    console.error(
      "Database initialization error:",
      error
    );
  }
};

initializeDatabase();

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
  res.json({
    message: "Todo API is running",
  });
});

/* =========================
   REGISTER
========================= */

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message:
        "Username and password are required",
    });
  }

  try {
    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE username = $1
      `,
      [username.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: "Username already exists",
      });
    }

    await pool.query(
      `
      INSERT INTO users
      (username, password)
      VALUES ($1, $2)
      `,
      [
        username.trim(),
        password,
      ]
    );

    res.status(201).json({
      message: "Registration successful",
    });

  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    res.status(500).json({
      message: "Database error",
    });
  }
});

/* =========================
   LOGIN
========================= */

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message:
        "Username and password are required",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, username, password
      FROM users
      WHERE username = $1
      `,
      [username.trim()]
    );

    const user = result.rows[0];

    if (!user || user.password !== password) {
      return res.status(401).json({
        message:
          "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
      },
      SECRET,
      {
        expiresIn: "30d",
      }
    );

    res.json({
      token,
      username: user.username,
    });

  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    res.status(500).json({
      message: "Database error",
    });
  }
});

/* =========================
   AUTHENTICATION
========================= */

const authenticate = (
  req,
  res,
  next
) => {
  const authHeader =
    req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const token =
    authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const user = jwt.verify(
      token,
      SECRET
    );

    req.user = user;

    next();

  } catch (error) {
    return res.status(401).json({
      message:
        "Invalid or expired token",
    });
  }
};

/* =========================
   GET TODOS
========================= */

app.get(
  "/todos",
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          title,
          priority,
          due_time,
          status,
          user_id
        FROM todos
        WHERE user_id = $1
        ORDER BY
          CASE priority
            WHEN 'High' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Low' THEN 3
            ELSE 4
          END,
          due_time ASC NULLS LAST,
          id DESC
        `,
        [req.user.id]
      );

      res.json(result.rows);

    } catch (error) {
      console.error(
        "GET TODOS ERROR:",
        error
      );

      res.status(500).json({
        message: "Database error",
      });
    }
  }
);

/* =========================
   ADD TODO
========================= */

app.post(
  "/todos",
  authenticate,
  async (req, res) => {
    const {
      title,
      priority,
      due_time,
      status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message:
          "Todo title is required",
      });
    }

    const finalPriority =
      priority || "Medium";

    const finalStatus =
      status || "Yet to Do";

    const allowedPriorities = [
      "Low",
      "Medium",
      "High",
    ];

    const allowedStatuses = [
      "Yet to Do",
      "In Progress",
      "Completed",
    ];

    if (
      !allowedPriorities.includes(
        finalPriority
      )
    ) {
      return res.status(400).json({
        message: "Invalid priority",
      });
    }

    if (
      !allowedStatuses.includes(
        finalStatus
      )
    ) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    try {
      const result = await pool.query(
        `
        INSERT INTO todos
        (
          title,
          priority,
          due_time,
          status,
          user_id
        )
        VALUES
        ($1, $2, $3, $4, $5)
        RETURNING
          id,
          title,
          priority,
          due_time,
          status,
          user_id
        `,
        [
          title.trim(),
          finalPriority,
          due_time || null,
          finalStatus,
          req.user.id,
        ]
      );

      res.status(201).json(
        result.rows[0]
      );

    } catch (error) {
      console.error(
        "ADD TODO ERROR:",
        error
      );

      res.status(500).json({
        message:
          "Database error while adding Todo",
      });
    }
  }
);

/* =========================
   UPDATE TODO
========================= */

app.put(
  "/todos/:id",
  authenticate,
  async (req, res) => {
    const {
      title,
      priority,
      due_time,
      status,
    } = req.body;

    const todoId =
      Number(req.params.id);

    if (!Number.isInteger(todoId)) {
      return res.status(400).json({
        message: "Invalid Todo ID",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        message:
          "Todo title is required",
      });
    }

    const finalPriority =
      priority || "Medium";

    const finalStatus =
      status || "Yet to Do";

    const allowedPriorities = [
      "Low",
      "Medium",
      "High",
    ];

    const allowedStatuses = [
      "Yet to Do",
      "In Progress",
      "Completed",
    ];

    if (
      !allowedPriorities.includes(
        finalPriority
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid priority",
      });
    }

    if (
      !allowedStatuses.includes(
        finalStatus
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid status",
      });
    }

    try {
      const result = await pool.query(
        `
        UPDATE todos
        SET
          title = $1,
          priority = $2,
          due_time = $3,
          status = $4
        WHERE
          id = $5
          AND user_id = $6
        RETURNING
          id,
          title,
          priority,
          due_time,
          status,
          user_id
        `,
        [
          title.trim(),
          finalPriority,
          due_time || null,
          finalStatus,
          todoId,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Todo not found or you do not have permission to edit it",
        });
      }

      res.json(
        result.rows[0]
      );

    } catch (error) {
      console.error(
        "UPDATE TODO ERROR:",
        error
      );

      res.status(500).json({
        message:
          error.message ||
          "Database error while updating Todo",
      });
    }
  }
);

/* =========================
   DELETE TODO
========================= */

app.delete(
  "/todos/:id",
  authenticate,
  async (req, res) => {
    const todoId =
      Number(req.params.id);

    if (!Number.isInteger(todoId)) {
      return res.status(400).json({
        message: "Invalid Todo ID",
      });
    }

    try {
      const result = await pool.query(
        `
        DELETE FROM todos
        WHERE
          id = $1
          AND user_id = $2
        RETURNING id
        `,
        [
          todoId,
          req.user.id,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message:
            "Todo not found",
        });
      }

      res.json({
        message:
          "Todo deleted successfully",
      });

    } catch (error) {
      console.error(
        "DELETE TODO ERROR:",
        error
      );

      res.status(500).json({
        message: "Database error",
      });
    }
  }
);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});