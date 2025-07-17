import { scrapeTikTok, scrapeSounds } from "./scraper.js";
import pg from "pg";

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const keywords = (process.env.KEYWORDS ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

(async () => {
  // scrape keyword trends
  for (const kw of keywords) {
    const vids = await scrapeTikTok(kw);
    for (const v of vids) {
      await db.query(
        `INSERT INTO tiktok_snapshots
         (video_id, keyword, likes, comments, shares, posted_at)
         VALUES ($1,$2,$3,$4,$5,to_timestamp($6))
         ON CONFLICT DO NOTHING`,
        [v.id, kw, v.likes, v.comments, v.shares, v.postedAt]
      );
    }
    console.log(`stored ${vids.length} videos for ${kw}`);
  }

  // scrape trending sounds
  const sounds = await scrapeSounds();
  for (const s of sounds) {
    await db.query(
      `INSERT INTO trending_sounds
       (sound_id, title, artist, video_count, scraped_at)
       VALUES ($1,$2,$3,$4,now())
       ON CONFLICT (sound_id) DO UPDATE
       SET video_count = EXCLUDED.video_count,
           scraped_at  = EXCLUDED.scraped_at`,
      [s.id, s.title, s.artist, s.uses]
    );
  }
  console.log(`stored ${sounds.length} sounds`);
  process.exit();
})();
