import express from "express";
import pg from "pg";
import { scrapeTikTok, scrapeSounds } from "./scraper.js";

const app = express();
const PORT = process.env.PORT || 3000;
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

/* ────────────────  Keyword trend endpoint  ──────────────── */
app.get("/trends", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Missing q keyword" });

  try {
    const videos = await scrapeTikTok(q);
    // store snapshots
    for (const v of videos) {
      await db.query(
        `INSERT INTO tiktok_snapshots
         (video_id, keyword, likes, comments, shares, posted_at)
         VALUES ($1,$2,$3,$4,$5,to_timestamp($6))
         ON CONFLICT DO NOTHING`,
        [v.id, q, v.likes, v.comments, v.shares, v.postedAt]
      );
    }
    res.json({ keyword: q, count: videos.length, results: videos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scrape failed" });
  }
});

/* ────────────────  Trending sound endpoint  ──────────────── */
app.get("/sounds", async (_req, res) => {
  try {
    const sounds = await scrapeSounds();
    // upsert into DB
    for (const s of sounds) {
      await db.query(
        `INSERT INTO trending_sounds (sound_id, title, artist, video_count, scraped_at)
         VALUES ($1,$2,$3,$4,now())
         ON CONFLICT (sound_id) DO UPDATE
           SET video_count = EXCLUDED.video_count,
               scraped_at  = EXCLUDED.scraped_at`,
        [s.id, s.title, s.artist, s.uses]
      );
    }
    res.json({ count: sounds.length, sounds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sound scrape failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
