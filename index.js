// index.js
import express from "express";
import { scrapeTikTok } from "./scraper.js";
import pg from "pg";

const app = express();
const PORT = process.env.PORT || 3000;

/* ─── Database connection ─────────────────────────────── */
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // set in Render later
});

/* ─── REST endpoint ───────────────────────────────────── */
app.get("/trends", async (req, res) => {
  const { q } = req.query;           // ?q=keyword
  if (!q) return res.status(400).json({ error: "Missing q keyword" });

  try {
    const results = await scrapeTikTok(q);

    // save a snapshot for each video (optional but prepares for trend ranking)
    for (const v of results) {
      await db.query(
        `INSERT INTO tiktok_snapshots
         (video_id, keyword, likes, comments, shares, posted_at)
         VALUES ($1,$2,$3,$4,$5,to_timestamp($6))
         ON CONFLICT DO NOTHING`,
        [v.id, q, v.likes, v.comments, v.shares, v.postedAt]
      );
    }

    res.json({ keyword: q, count: results.length, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scrape failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
