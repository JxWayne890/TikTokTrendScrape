-- schema.sql
CREATE TABLE IF NOT EXISTS tiktok_snapshots (
  id          SERIAL PRIMARY KEY,
  video_id    TEXT NOT NULL,
  keyword     TEXT NOT NULL,
  likes       INTEGER DEFAULT 0,
  comments    INTEGER DEFAULT 0,
  shares      INTEGER DEFAULT 0,
  posted_at   TIMESTAMP,          -- time video was originally posted
  scraped_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (video_id, scraped_at)
);
