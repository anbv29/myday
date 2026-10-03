/* eslint-disable @typescript-eslint/no-unused-expressions */
async (page) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0s !important; animation: none !important; }' });
  const results = [];
  const inspect = async (theme, width) => {
    await page.setViewportSize({ width, height: 1000 });
    const state = await page.evaluate(() => {
      const luminance = (color) => {
        const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((channel) => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; });
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
      };
      const contrast = (foreground, background) => { const a = luminance(foreground); const b = luminance(background); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const body = getComputedStyle(document.body);
      const muted = getComputedStyle(document.querySelector('.calendar-intro p'));
      const button = getComputedStyle(document.querySelector('.collection-intro-actions .future-button-primary'));
      const card = getComputedStyle(document.querySelector('.ranked-calendar-cell'));
      const price = getComputedStyle(document.querySelector('.ranked-calendar-value strong'));
      return { theme: document.documentElement.dataset.theme, width: innerWidth, scroll: document.documentElement.scrollWidth, contrasts: { body: contrast(body.color, body.backgroundColor), secondary: contrast(muted.color, body.backgroundColor), action: contrast(button.color, button.backgroundColor), price: contrast(price.color, card.backgroundColor) }, selects: document.querySelectorAll('#matrix-view select').length, count: document.querySelectorAll('.ranked-calendar-cell').length };
    });
    if (state.width !== state.scroll || state.selects !== 0 || Object.values(state.contrasts).some((ratio) => ratio < 4.5)) throw new Error(JSON.stringify(state));
    results.push(state);
    await page.screenshot({ path: `output/playwright/modern-${theme}-${width}.png` });
  };
  await inspect('light', 1440);
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await inspect('dark', 1440);
  await inspect('dark', 390);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await inspect('light', 390);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.screenshot({ path: 'output/playwright/modern-mobile-menu.png' });
  await page.goto('http://localhost:3000/claim');
  await page.screenshot({ path: 'output/playwright/modern-claim-mobile.png' });
  return results;
}
