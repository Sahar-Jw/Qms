/**
 * Do not download Chromium during `npm install`.
 * On shared hosting (cPanel) Chromium cannot run anyway: the /print page is used instead of /pdf.
 * On a VPS where you installed Chrome yourself, set PUPPETEER_EXECUTABLE_PATH in .env and PDF export works.
 */
module.exports = { skipDownload: true };
