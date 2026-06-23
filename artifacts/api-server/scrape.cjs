const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://blaze.codes/produkty/vibe-coding', { waitUntil: 'networkidle' });
  const text = await page.innerText('body');
  console.log("--- BLAZE CODES TEXT ---");
  console.log(text);
  await browser.close();
})();
