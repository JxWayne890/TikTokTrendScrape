// scraper.js
import puppeteer from "puppeteer";

/* ─────────────────────────  Helpers ───────────────────────── */
function parseTikTokNumber(txt = "") {
  if (txt.endsWith("K")) return parseFloat(txt) * 1_000;
  if (txt.endsWith("M")) return parseFloat(txt) * 1_000_000;
  return Number(txt.replace(/[^\d]/g, ""));
}

/* ────────────────────  Keyword video scraper ─────────────────── */
export async function scrapeTikTok(keyword, limit = 20) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Optional: reuse a TikTok session cookie for fewer captchas
  if (process.env.COOKIE) {
    await page.setExtraHTTPHeaders({ cookie: process.env.COOKIE });
  }

  const searchURL = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
  await page.goto(searchURL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("div[data-e2e='search-video-item']");

  // quick auto-scroll to force ~3 pages of results
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(1200);
  }

  const links = await page.$$eval(
    "div[data-e2e='search-video-item'] a[href*='/video/']",
    (as) => [...new Set(as.map((a) => a.href))]
  );

  const sample = links.slice(0, limit);
  const results = [];

  for (const link of sample) {
    try {
      const vPage = await browser.newPage();
      await vPage.goto(link, { waitUntil: "domcontentloaded" });
      await vPage.waitForSelector("h1", { timeout: 10_000 });

      const data = await vPage.evaluate(() => {
        const videoId = location.pathname.split("/").pop();
        const caption = document.querySelector("h1")?.innerText || "";
        const author = document
          .querySelector("a[data-e2e='browse-video-username']")
          ?.innerText.replace("@", "") || "";

        const likes = document.querySelector("strong[data-e2e='like-count']")?.innerText || "0";
        const comments = document.querySelector("strong[data-e2e='comment-count']")?.innerText || "0";
        const shares = document.querySelector("strong[data-e2e='share-count']")?.innerText || "0";

        // creation time lives inside embedded JSON
        let postedAt = null;
        const json = document.querySelector("#__UNIVERSAL_DATA__")?.textContent;
        if (json) {
          try {
            const obj = JSON.parse(json);
            postedAt = obj?.globals?.videoData?.itemInfos?.createTime ?? null;
          } catch {}
        }

        return {
          id: videoId,
          link: location.href,
          caption,
          author,
          likes,
          comments,
          shares,
          postedAt,
          hashtags: caption.match(/#\w+/g) || [],
        };
      });

      results.push({
        ...data,
        likes: parseTikTokNumber(data.likes),
        comments: parseTikTokNumber(data.comments),
        shares: parseTikTokNumber(data.shares),
      });
      await vPage.close();
    } catch (_) {
      /* skip failures */
    }
  }

  await browser.close();
  return results;
}

/* ────────────────────  Trending sound scraper ─────────────────── */
export async function scrapeSounds(limit = 25) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.goto("https://www.tiktok.com/music", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("div[data-e2e='music-item-card']");

  const sounds = await page.$$eval(
    "div[data-e2e='music-item-card']",
    (cards, lim) =>
      cards.slice(0, lim).map((el) => {
        const link = el.querySelector("a")?.href || "";
        const [, id] = link.match(/music\/[^/]+\/(\d+)/) || [];
        return {
          id,
          link,
          title: el.querySelector('[data-e2e="music-card-name"]')?.innerText || "",
          artist: el.querySelector('[data-e2e="music-card-artist"]')?.innerText || "",
          uses: parseInt(
            (el.querySelector('[data-e2e="music-card-video-count"]')?.innerText || "0").replace(
              /\D/g,
              ""
            ),
            10
          ),
        };
      }),
    limit
  );

  await browser.close();
  return sounds;
}
