#!/usr/bin/env node
/**
 * screenshots.js — снимки экранов приложения: телефон и настольный размер,
 * светлая и тёмная темы.
 *
 * Нужен запущенный сервер, как и для audit.js:
 *
 *   python3 -m http.server 8777        (из корня репозитория)
 *   npm --prefix tools install         (один раз, ставит playwright)
 *   node tools/screenshots.js [папка] [порт]
 *
 * По умолчанию складывает в ./screenshots, которая не попадает в репозиторий.
 * Путь к браузеру задаётся переменной CHROMIUM_PATH.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'screenshots'));
const PORT = process.argv[3] || process.env.PORT || '8777';
const BASE = `http://127.0.0.1:${PORT}/index.html`;

let chromium, devices;
try {
    ({ chromium, devices } = require('playwright'));
} catch (err) {
    console.error('Не найден playwright. Установите: npm --prefix tools install');
    process.exit(2);
}

const launchOptions = process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : {};

fs.mkdirSync(OUT, { recursive: true });

/** Открывает страницу и ждёт, пока догрузится колода. */
async function open(browser, options) {
    const ctx = await browser.newContext(options);
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.DeckLoader && window.DeckLoader.loaded', { timeout: 15000 });
    return { ctx, page };
}

(async () => {
    const browser = await chromium.launch(launchOptions);
    const phone = devices['iPhone 13'];

    for (const [theme, scheme] of [['light', 'light'], ['dark', 'dark']]) {
        const { ctx, page } = await open(browser, { ...phone, colorScheme: scheme });

        await page.screenshot({ path: `${OUT}/phone-${theme}-1-welcome.png`, fullPage: true });

        await page.evaluate(() => App.doSpread('threecards'));
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/phone-${theme}-2-spread.png` });

        await page.evaluate(() => App.showDeck());
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/phone-${theme}-3-gallery.png` });

        await page.evaluate(() => UI.showCardDetail('Башня'));
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/phone-${theme}-4-card.png` });

        // Та же карточка с раскрытыми глубокими полями. Раскрывашка лежит
        // ниже видимой области, поэтому без прокрутки кадр не отличался бы
        // от предыдущего вовсе.
        await page.evaluate(() => {
            document.querySelectorAll('details.deep-fields').forEach((d) => { d.open = true; });
            const first = document.querySelector('details.deep-fields');
            if (first) first.scrollIntoView({ block: 'start' });
        });
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/phone-${theme}-5-card-open.png` });

        await ctx.close();
    }

    for (const [theme, scheme] of [['light', 'light'], ['dark', 'dark']]) {
        const { ctx, page } = await open(browser, {
            viewport: { width: 1280, height: 900 }, colorScheme: scheme
        });
        await page.screenshot({ path: `${OUT}/desktop-${theme}-1-welcome.png` });
        await page.evaluate(() => App.doSpread('celtic'));
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/desktop-${theme}-2-celtic.png` });
        await page.evaluate(() => App.showDeck());
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/desktop-${theme}-3-gallery.png` });
        await ctx.close();
    }

    await browser.close();

    console.log('Снимки в', OUT);
    for (const f of fs.readdirSync(OUT).sort()) {
        console.log('  ', f, (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' КБ');
    }
})().catch((e) => {
    console.error('Съёмка упала:', e && (e.message || e));
    console.error('Запущен ли сервер? python3 -m http.server ' + PORT);
    process.exit(1);
});
