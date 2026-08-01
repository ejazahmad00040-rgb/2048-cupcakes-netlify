# Deploy on Netlify (upload-ready)

This folder is a **static** copy of 2048 Cupcakes with SEO title/description tuned for Netlify.

## Option A — Drag & drop (fastest)

1. Go to https://app.netlify.com and sign in
2. **Add new site → Deploy manually**
3. Drag **this whole folder** onto the upload area
4. Wait for deploy → open the `.netlify.app` URL

## Option B — Netlify Drop

1. Visit https://app.netlify.com/drop
2. Drop this folder
3. Site goes live instantly

## Option C — GitHub

1. New repo with these files
2. Netlify → Add site → Import from Git
3. Build command: empty
4. Publish directory: `.` (site root)
5. Deploy

## After first deploy (important for SEO)

1. Open `js/site-config.js` and set:
   `SITE_URL: "https://YOUR-SITE.netlify.app"`
   (no trailing slash)
2. Update `js/site-config.min.js` the same `SITE_URL`
3. In `sitemap.xml` + `robots.txt`, replace `YOUR_LIVE_URL` with your real https URL
4. Drag-drop / redeploy again

## Notes

- Do **not** upload `node_modules` (not included)
- GitHub Pages + Vercel packs are separate; this pack is only for Netlify
