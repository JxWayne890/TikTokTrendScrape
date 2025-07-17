// scraper.js
import puppeteer from "puppeteer";

export async function scrapeTikTok(keyword, limit = 20, concurrency = 5) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
  );

  /* ── 1. Open search page ────────────────────────────── */
  const url = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // small auto-scroll to force more items to load
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await page.waitForTimeout(1200);
  }

  /* ── 2. Collect video links from search grid ────────── */
  const links = await page.$$eval(
    "div[data-e2e='search-video-item'] a[href*='/video/']",
    (as) => [...new Set(as.map((a) => a.href))] // dedupe
  );

  const sample = links.slice(0, limit);

  /* ── 3. Visit each video page (parallel with cap) ──── */
  const batches = [];
  while (sample.length) batches.push(sample.splice(0, concurrency));

  const results = [];
  for (const batch of batches) {
    const pages = await Promise.all(batch.map(() => browser.newPage()));

    await Promise.all(
      pages.map((p, idx) => p.goto(batch[idx], { waitUntil: "domcontentloaded" }))
    );

    const partial = await Promise.all(
      pages.map((p) =>
        p.evaluate(() => {
          // helper to read number text (e.g., 1.2M -> 1200000)
          const parseNum = (s) => {
            if (!s) return 0;
            if (s.endsWith("K")) return parseFloat(s) * 1e3;
            if (s.endsWith("M")) return parseFloat(s) * 1e6;
            return Number(s.replace(/[^\d]/g, ""));
          };

          const videoId = location.pathname.split("/").pop();
          const caption = document.querySelector("h1")?.innerText || "";
          const author = document
            .querySelector("a[data-e2e='browse-video-username']")
            ?.innerText.replace("@", "") || "";

          const likes = parseNum(
            document.querySelector("strong[data-e2e='like-count']")?.innerText
          );
          const comments = parseNum(
            document.querySelector("strong[data-e2e='comment-count']")?.innerText
          );
          const shares = parseNum(
            document.querySelector("strong[data-e2e='share-count']")?.innerText
          );

          // extract epoch createTime from embedded JSON
          let postedAt = null;
          const json = document.querySelector("#__UNIVERSAL_DATA__")?.textContent;
          if (json) {
            try {
              const data = JSON.parse(json);
              postedAt =
                data?.globals?.videoData?.itemInfos?.createTime ?? null;
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
        })
      )
    );

    results.push(...partial);
    await Promise.all(pages.map((p) => p.close()));
  }

  await browser.close();
  return results;
}
