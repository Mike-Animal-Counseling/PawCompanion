import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const channel = process.env.E2E_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chrome');
const password = 'PawCompanion!2026';

const browser = await chromium.launch({ channel, headless: true });
const results = [];

async function step(name, fn) {
  try {
    await fn();
    results.push(`✓ ${name}`);
  } catch (error) {
    results.push(`✗ ${name}: ${error.message}`);
    throw error;
  }
}

async function signIn(page, path, email, pass, buttonName) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(pass);
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  await page.waitForTimeout(1200);
}

try {
  const guest = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const guestPage = await guest.newPage();
  await step('guest discovery renders', async () => {
    await guestPage.goto(base, { waitUntil: 'networkidle' });
    await guestPage.getByRole('heading', { name: /Meet someone who makes the day/ }).waitFor();
  });
  await guest.close();

  const customer = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await customer.newPage();
  await step('guest can sign in', async () => {
    await signIn(page, '/login', 'maya@example.com', password, 'Sign in');
    await page.getByRole('heading', { name: /Maya/ }).waitFor();
  });
  await step('member home shows the online track', async () => {
    await page.getByText('Your conversations').waitFor();
    await page.getByText('Online companionship').waitFor();
  });
  await step('check-in page loads', async () => {
    await page.goto(base + '/check-in', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'How are you, really?' }).waitFor();
  });
  let companionHref;
  await step('companion detail exposes bond and services', async () => {
    await page.goto(base, { waitUntil: 'networkidle' });
    companionHref = await page.locator('a[href^="/companions/"]').first().getAttribute('href');
    await page.goto(base + companionHref, { waitUntil: 'networkidle' });
    await page.getByText('Your companionship').waitFor();
    await page.getByText('2-hour visit', { exact: false }).first().waitFor();
  });
  await step('digital pet replies with a translated animal sound', async () => {
    await page.getByRole('link', { name: /Meet digital/ }).click();
    await page.getByText('Digital pet', { exact: false }).first().waitFor();
    await page.locator('textarea').fill('Hi, I just got home.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.getByText(/translated/i).first().waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: /Hear / }).waitFor();
  });
  await step('booking screen offers three in-person services', async () => {
    await page.goto(base + companionHref, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Book in person/ }).click();
    await page.getByText('What kind of time together?').waitFor();
    assert.equal(await page.getByRole('radio').count(), 3);
  });
  await step('visits screen loads', async () => {
    await page.goto(base + '/visits', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'My visits' }).waitFor();
  });
  await customer.close();

  const partner = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const partnerPage = await partner.newPage();
  await step('partner console loads', async () => {
    await signIn(partnerPage, '/merchant/login', 'hello@willowandwhiskers.example', 'MerchantDemo!2026', 'Open partner console');
    await partnerPage.goto(base + '/merchant', { waitUntil: 'networkidle' });
    await partnerPage.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }).waitFor();
    await partnerPage.goto(base + '/merchant/bookings', { waitUntil: 'networkidle' });
    await partnerPage.getByRole('heading', { name: 'Visit requests' }).waitFor();
  });
  await partner.close();

  const operator = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const operatorPage = await operator.newPage();
  await step('operator safety queue loads', async () => {
    await operatorPage.goto(base + '/admin/login', { waitUntil: 'networkidle' });
    await operatorPage.locator('#admin-email').fill('admin@pawcompanion.app');
    await operatorPage.locator('#admin-password').fill('AdminDemo!2026');
    await operatorPage.getByRole('button', { name: 'Enter operations' }).click();
    await operatorPage.waitForURL((url) => url.pathname === '/admin', { timeout: 15000 });
    await operatorPage.goto(base + '/admin?tab=safety', { waitUntil: 'networkidle' });
    await operatorPage.getByRole('heading', { name: 'Safety queue' }).waitFor();
  });
  await operator.close();
} finally {
  await browser.close();
  console.log(results.join('\n'));
}
