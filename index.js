// index.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import crypto from "crypto";

const { Pool } = pkg;

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
  port: 5432,
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
  const events = Array.isArray(req.body) ? req.body : [req.body];

  try {
    for (const event of events) {
      if (!isValidEvent(event)) continue;

      await pool.query(
        `
        INSERT INTO events (
            event_type,
            page_url,
            referrer,
            anonymous_id,
            session_id,
            source,
            campaign_id,
            timestamp,
            data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          event.event_type,
          event.page_url,
          event.referrer || null,
          event.anonymous_id,
          event.session_id || null,
          event.source || "unknown",
          event.campaign_id || null,
          event.timestamp,
          event,
        ]
      );
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ---------- Redirect Tracking ---------- */
app.get("/r/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    // Get the destination link
    const result = await pool.query(
      `SELECT * FROM short_links WHERE slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Link not found");
    }

    const link = result.rows[0];

    // Generate temporary anonymous ID (no cookie)
    const anonId = crypto.randomUUID();

    // Log the redirect as an event
    await pool.query(
      `
      INSERT INTO events (
        event_type,
        page_url,
        anonymous_id,
        source,
        campaign_id,
        timestamp,
        data
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        "short_link_click",
        link.destination_url,
        anonId,
        link.source || "unknown",
        link.campaign_id || null,
        new Date().toISOString(),
        { slug, destination: link.destination_url },
      ]
    );

    // Redirect the user
    res.redirect(302, link.destination_url);
  } catch (err) {
    console.error("Redirect error:", err);
    res.status(500).send("Server error");
  }
});

/* ---------- Start Server ---------- */
if (process.argv[1].endsWith("index.js")) {
  app.listen(3000, () => {
    console.log("Tracking API running on http://localhost:3000");
  });
}

export { app, pool };
