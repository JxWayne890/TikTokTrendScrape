-- Videos scraped for keyword trends
CREATE TABLE IF NOT EXISTS tiktok_snapshots (
  id          SERIAL PRIMARY KEY,
  video_id    TEXT NOT NULL,
  keyword     TEXT NOT NULL,
  likes       INTEGER DEFAULT 0,
  comments    INTEGER DEFAULT 0,
  shares      INTEGER DEFAULT 0,
  posted_at   TIMESTAMP,
  scraped_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (video_id, scraped_at)
);

-- Trending sounds / music leaderboard
CREATE TABLE IF NOT EXISTS trending_sounds (
  sound_id     TEXT PRIMARY KEY,
  title        TEXT,
  artist       TEXT,
  video_count  INTEGER,
  scraped_at   TIMESTAMP
);
