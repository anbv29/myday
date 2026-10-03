async (page) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/ranked-home-desktop.png' });
  console.log(await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, columns: getComputedStyle(document.querySelector('.ranked-calendar-grid')).gridTemplateColumns, selects: document.querySelectorAll('#matrix-view select').length })));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/ranked-home-mobile.png' });
  console.log(await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth, columns: getComputedStyle(document.querySelector('.ranked-calendar-grid')).gridTemplateColumns })));
  await page.evaluate(() => {
    const grid = document.querySelector('.ranked-calendar-grid');
    const sample = grid.firstElementChild;
    document.querySelector('#ranked-calendar-title').textContent = 'Layout test fixture: 30 dates';
    for (let index = 1; index < 30; index++) {
      const tile = sample.cloneNode(true);
      tile.querySelector('.ranked-calendar-value > span').textContent = `#${index + 1}`;
      tile.querySelector('h3').textContent = 'A very long milestone title to check wrapping';
      tile.querySelector('.ranked-calendar-holder a').textContent = '@averylongpublichandleforlayouttesting';
      grid.appendChild(tile);
    }
    grid.querySelector('strong').textContent = '$123,456,789.00';
  });
  await page.screenshot({ path: 'output/playwright/ranked-grid-30-mobile-fixture.png', fullPage: true });
  console.log(await page.evaluate(() => ({ fixtureCount: document.querySelectorAll('.ranked-calendar-cell').length, viewport: innerWidth, scroll: document.documentElement.scrollWidth })));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/ranked-grid-30-desktop-fixture.png' });
  await page.reload();
  await page.locator('.ranked-calendar-link').first().click();
  console.log({ detailUrl: page.url() });
}
