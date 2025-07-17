services:
  - type: web
    name: tiktok-trend-api
    env: node
    plan: free
    buildCommand: "npm install"
    startCommand: "node index.js"
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: tiktok-db
          property: connectionString
      - key: COOKIE
        value: ""

  # ⬇️ change “worker” → “cron” here
  - type: cron
    name: tiktok-trend-cron
    env: node
    plan: free
    buildCommand: "npm install"
    startCommand: "node cron.js"
    schedule: "0 */3 * * *"   # every 3 hours
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: tiktok-db
          property: connectionString
      - key: KEYWORDS
        value: "summer outfits,cleaning hacks,bible study"
      - key: COOKIE
        value: ""

databases:
  - name: tiktok-db
    plan: free
