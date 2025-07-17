// cron.js
import { scrapeTikTok } from "./scraper.js";
import pg from "pg";

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// keywords come from an env var:  KEYWORDS="summer outfits,cleaning hacks,bible study"
const keywords = (process.env.KEYWORDS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
if (!keywords.length) {
  console.error("No KEYWORDS supplied");
  process.exit(1);
}

(async () => {
  for (const kw of keywords) {
    try {
      console.log(`► scraping ${kw}`);
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
      console.log(`✓ stored ${vids.length} items for ${kw}`);
    } catch (err) {
      console.error(`✗ failed on ${kw}`, err);
    }
  }
  await db.end();
  process.exit();
})();
