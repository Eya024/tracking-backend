const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- PostgreSQL ---------- */
const pool = new Pool({
    host: "localhost",
    user: "postgres",
    password: "root",
    database: "tracking_db",
    port: 5432
});

/* ---------- Validation ---------- */
function isValidEvent(event) {
    return (
        event &&
        event.event_type &&
        event.page_url &&
        event.anonymous_id &&
        event.timestamp
    );
}

/* ---------- Tracking Endpoint ---------- */
app.post("/track", async (req, res) => {
  const event = req.body;

  if (!isValidEvent(event)) {
    return res.status(400).json({ error: "Invalid event data" });
  }

  try {
    // Store event in events table
    await pool.query(
      `
      INSERT INTO events (
        event_type,
        page_url,
        referrer,
        anonymous_id,
        session_id,
        timestamp,
        data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        event.event_type,
        event.page_url,
        event.referrer || null,
        event.anonymous_id,
        event.session_id || null,
        event.timestamp,
        event
      ]
    );

    // Handle session table
    if (event.event_type === "session_start") {
      await pool.query(
        `
        INSERT INTO sessions (session_id, anonymous_id, session_start)
        VALUES ($1, $2, $3)
        ON CONFLICT (session_id) DO NOTHING
        `,
        [event.session_id, event.anonymous_id, event.timestamp]
      );
    } else if (event.event_type === "session_end") {
      await pool.query(
        `
        UPDATE sessions
        SET session_end = $1
        WHERE session_id = $2
        `,
        [event.timestamp, event.session_id]
      );
    }

    console.log("Event saved:", event.event_type);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});


/* ---------- Start Server ---------- */
if (require.main === module) {
  app.listen(3000, () => {
    console.log("Tracking API running on http://localhost:3000");
  });
}

module.exports = app;

