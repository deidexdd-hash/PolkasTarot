#!/usr/bin/env node
/**
 * audit.js — проверка вёрстки в настоящем браузере на экране телефона.
 *
 * Ловит то, чего не видно ни на скриншоте, ни в разборе кода: элементы,
 * уехавшие за край экрана, слишком мелкие зоны касания и кнопки, которые
 * перекрыты чем-то сверху и потому не нажимаются.
 *
 * Требует запущенного сервера — приложение читает data/cards.json через
 * fetch, а с file:// браузер это запрещает:
 *
 *   python3 -m http.server 8777        (из корня репозитория)
 *   npm --prefix tools install         (один раз, ставит playwright)
 *   node tools/audit.js [порт]
 *
 * Путь к браузеру можно задать переменной CHROMIUM_PATH, если playwright
 * не находит свою сборку.
 *
 * Код возврата 1, если найдены проблемы.
 */
const PORT = process.argv[2] || process.env.PORT || '8777';

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

let problems = 0;
const ok = (cond, msg) => {
    if (!cond) problems += 1;
    console.log((cond ? 'OK   ' : 'СБОЙ ') + msg);
};

(async () => {
    const browser = await chromium.launch(launchOptions);
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();

    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(String(e)));

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction('window.DeckLoader && window.DeckLoader.loaded', { timeout: 15000 });

    /** Экран не должен прокручиваться вбок, а кнопки — быть меньше пальца. */
    const scan = () => page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const out = { pageOverflow: document.documentElement.scrollWidth - vw, escaped: [], small: [] };

        // Элемент внутри горизонтального скроллера уезжать за край вправе.
        const insideScroller = (el) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
                const st = getComputedStyle(p);
                if (st.overflowX === 'auto' || st.overflowX === 'scroll') return true;
            }
            return false;
        };

        for (const el of document.querySelectorAll('body *')) {
            const b = el.getBoundingClientRect();
            if (!b.width || !b.height) continue;
            if (getComputedStyle(el).position === 'fixed') continue;
            if (b.right > vw + 1 && !insideScroller(el)) {
                out.escaped.push(`${el.tagName}.${el.className}`.slice(0, 60));
            }
            if (el.tagName === 'BUTTON' && (b.height < 30 || b.width < 30)) {
                out.small.push(`${el.className || el.tagName}: ${Math.round(b.width)}x${Math.round(b.height)}`);
            }
        }
        return out;
    });

    for (const [label, act] of [
        ['приветствие', null],
        ['галерея', () => page.evaluate(() => App.showDeck())],
        ['расклад', () => page.evaluate(() => App.doSpread('celtic'))]
    ]) {
        if (act) { await act(); await page.waitForTimeout(400); }
        const r = await scan();
        console.log(`\n--- ${label} ---`);
        ok(r.pageOverflow <= 1, `страница не уезжает вбок (${Math.max(0, r.pageOverflow)} px)`);
        ok(r.escaped.length === 0, `элементов за краем: ${r.escaped.length}${r.escaped.length ? ' — ' + r.escaped.slice(0, 3).join('; ') : ''}`);
        ok(r.small.length === 0, `кнопок мельче 30 px: ${r.small.length}${r.small.length ? ' — ' + r.small.slice(0, 3).join('; ') : ''}`);
    }

    console.log('\n--- лента раскладов ---');
    const strip = await page.evaluate(() => {
        const chip = document.querySelector('.spread-chip').getBoundingClientRect();
        const title = document.querySelector('.nav-title').getBoundingClientRect();
        return { chip: Math.round(chip.left), title: Math.round(title.left) };
    });
    ok(strip.chip === strip.title,
       `первая плашка выровнена с заголовком (${strip.chip} px против ${strip.title} px)`);

    console.log('\n--- карточка карты ---');
    await page.evaluate(() => UI.showCardDetail('Башня'));
    await page.waitForTimeout(400);
    const close = await page.evaluate(() => {
        const b = document.querySelector('.sheet-close');
        const r = b.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { reachable: !!(top && (top === b || b.contains(top))),
                 covered: top ? `${top.tagName}.${top.className}`.slice(0, 50) : 'ничего' };
    });
    ok(close.reachable, `кнопка закрытия нажимается (под курсором: ${close.covered})`);

    const deep = await page.evaluate(() => {
        const body = document.getElementById('modalBody');
        const det = [...body.querySelectorAll('details.deep-fields')];
        const collapsed = body.scrollHeight;
        det.forEach((d) => { d.open = true; });
        return { count: det.length, open: det.filter((d) => d.open).length,
                 collapsed, expanded: body.scrollHeight };
    });
    ok(deep.count > 0, `глубокие поля свёрнуты в раскрывашку (${deep.count} шт.)`);
    ok(deep.collapsed < deep.expanded,
       `свёрнутая карточка короче: ${deep.collapsed} px против ${deep.expanded} px`);

    console.log('\n--- консоль страницы ---');
    ok(consoleErrors.length === 0,
       consoleErrors.length ? 'ошибки: ' + consoleErrors.slice(0, 3).join('; ') : 'чисто');

    await browser.close();
    console.log(problems ? `\nПРОБЛЕМ: ${problems}` : '\nПроблем не найдено');
    process.exit(problems ? 1 : 0);
})().catch((e) => {
    console.error('Проверка упала:', e && (e.message || e));
    console.error('Запущен ли сервер? python3 -m http.server ' + PORT);
    process.exit(1);
});
