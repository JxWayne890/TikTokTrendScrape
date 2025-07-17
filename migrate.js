import pg from 'pg';
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await db.query(`
  CREATE TABLE IF NOT EXISTS tiktok_snapshots (
    id SERIAL PRIMARY KEY,
    video_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    posted_at TIMESTAMP,
    scraped_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (video_id, scraped_at)
  );
`);

console.log('Table created');
process.exit();
