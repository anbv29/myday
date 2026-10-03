/* eslint-disable @typescript-eslint/no-unused-expressions */
async (page) => {
  await page.goto('http://localhost:3000/claim?date=2026-10-29');
  await page.locator('.claim-page-header').waitFor({ state: 'visible', timeout: 20000 });
  await page.screenshot({ path: 'output/playwright/modern-claim-mobile.png', fullPage: true, caret: 'initial' });
  return { formVisible: await page.locator('.claim-form').isVisible(), pricingUnavailable: await page.getByRole('heading', { name: 'Pricing is unavailable.' }).isVisible(), url: page.url() };
}
