#!/usr/bin/env node
/**
 * e2e.js — прогон index.html в настоящем DOM.
 *
 * Приложение собирается из тегов <script> и читает data/cards.json, поэтому
 * проверять его разбором файлов бесполезно: половина ошибок вылезает только
 * когда скрипты действительно выполнились. Здесь страница поднимается в jsdom,
 * fetch подменяется чтением файла с диска, и проверяется то, что видит
 * пользователь: колода, галерея, карточка, расклад.
 *
 * Запуск из корня репозитория:
 *
 *   npm --prefix tools install     — один раз, ставит jsdom
 *   node tools/e2e.js              — обычный прогон
 *   node tools/e2e.js --broken-storage
 *                                  — localStorage бросает на каждый вызов:
 *                                    так ведёт себя приватный режим и запрет
 *                                    данных сайта. Колода обязана загрузиться
 *                                    всё равно.
 *
 * Код возврата 1, если хоть одна проверка не прошла.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BROKEN = process.argv.includes('--broken-storage');

let JSDOM, VirtualConsole;
try {
    ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (err) {
    console.error('Не найден jsdom. Установите: npm --prefix tools install');
    process.exit(2);
}

const logs = [];
const errors = [];
let failed = 0;

const ok = (cond, msg) => {
    if (!cond) failed += 1;
    console.log((cond ? 'OK   ' : 'СБОЙ ') + msg);
};

(async () => {
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => {
        // jsdom не умеет грузить картинки и scrollIntoView — это шум
        // окружения, а не ошибка приложения.
        const msg = (e && (e.message || String(e))) || '';
        if (/Could not load img|Not implemented/i.test(msg)) return;
        errors.push('jsdom: ' + msg);
    });
    vc.on('error', (m) => errors.push('console.error: ' + m));
    vc.on('warn', (m) => errors.push('предупреждение: ' + m));
    vc.on('log', (m) => logs.push(String(m)));

    const dom = await JSDOM.fromFile(path.join(ROOT, 'index.html'), {
        virtualConsole: vc,
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        beforeParse(window) {
            window.fetch = async (url) => {
                const file = path.join(ROOT, String(url));
                if (!fs.existsSync(file)) {
                    return { ok: false, status: 404, async json() { throw new Error('404'); } };
                }
                const body = fs.readFileSync(file, 'utf8');
                return { ok: true, status: 200, async json() { return JSON.parse(body); } };
            };
            // У file:// в jsdom непрозрачный origin, и настоящий localStorage
            // там бросает SecurityError. Подставляем свой.
            const store = new Map();
            Object.defineProperty(window, 'localStorage', {
                configurable: true,
                value: BROKEN ? {
                    getItem() { throw new Error('доступ к хранилищу запрещён'); },
                    setItem() { throw new Error('доступ к хранилищу запрещён'); }
                } : {
                    getItem: (k) => (store.has(k) ? store.get(k) : null),
                    setItem: (k, v) => store.set(k, String(v))
                }
            });
            window.alert = (m) => logs.push('ALERT: ' + m);
            window.confirm = () => true;
        }
    });

    const w = dom.window;
    for (let i = 0; i < 100 && !(w.DeckLoader && w.DeckLoader.loaded); i++) {
        await new Promise((r) => setTimeout(r, 50));
    }

    console.log(BROKEN ? '=== localStorage бросает исключение ===' : '=== обычный запуск ===');

    console.log('\n--- загрузка данных ---');
    ok(w.DeckLoader && w.DeckLoader.loaded, 'колода загружена из data/cards.json');
    const db = w.TarotDB;
    ok(db.major.length === 22, `старших арканов: ${db.major.length} (ждём 22)`);
    for (const suit of ['wands', 'cups', 'swords', 'pentacles']) {
        ok(db.minor[suit].length === 14, `${suit}: ${db.minor[suit].length} (ждём 14)`);
    }

    console.log('\n--- колода ---');
    const deck = w.Deck.create();
    ok(deck.length === 78, `Deck.create(): ${deck.length} карт`);
    ok(new Set(deck.map((c) => c.name)).size === 78, 'все имена уникальны');
    const imgs = deck.map((c) => c.img);
    ok(imgs.every(Boolean), 'у каждой карты указана картинка');
    const missing = imgs.filter((p) => !fs.existsSync(path.join(ROOT, p)));
    ok(missing.length === 0, `битых путей к картинкам: ${missing.length}`);

    console.log('\n--- галерея ---');
    w.UI.renderDeckGallery();
    const gallery = w.document.getElementById('spread-container').innerHTML;
    ok(gallery.includes('Все (78)'), 'счётчик «Все (78)»');
    ok(gallery.includes('Старшие арканы (22)'), 'счётчик старших арканов');
    ok(!/Ошибка загрузки/.test(gallery), 'нет сообщения об ошибке');

    console.log('\n--- карточка: старший аркан ---');
    w.UI.showCardDetail('Башня');
    const major = w.document.getElementById('modalBody').innerHTML;
    ok(major.includes('Башня'), 'название карты');
    ok(major.includes('Старший аркан'), 'тип карты определён');
    ok(major.includes('<ul class="meaning-list">'), 'списки выводятся списком');
    ok(!/,[а-яё]/i.test(major.replace(/<[^>]+>/g, '')), 'нет склейки «совет1,совет2»');
    for (const label of ['Общее значение', 'Отношения с окружающими', 'Здоровье', 'Совет']) {
        ok(major.includes(label), `сразу видно: «${label}»`);
    }
    ok(major.includes('Подробнее о карте'), 'глубокие поля убраны под раскрывашку');
    for (const label of ['Символика', 'Психологический аспект', 'Духовный аспект',
                         'Сроки', 'Сочетания с другими картами']) {
        ok(major.includes(label), `есть в раскрывашке: «${label}»`);
    }
    const yesNo = (major.match(/Ответ да\/нет/g) || []).length;
    ok(yesNo === 1, `у старшего аркана ответ да/нет выведен один раз (найдено ${yesNo})`);

    console.log('\n--- карточка: младший аркан ---');
    w.UI.showCardDetail('Туз Кубков');
    const minor = w.document.getElementById('modalBody').innerHTML;
    ok(minor.includes('Масть Кубков'), 'тип карты');
    ok(!minor.includes('Символика'), 'символики нет — поле не выдумано');
    ok(!minor.includes('Подробнее о карте'), 'раскрывашка не рисуется: глубоких полей нет');
    const minorYesNo = (minor.match(/Ответ да\/нет/g) || []).length;
    ok(minorYesNo === 2, `ответ да/нет в обоих положениях (найдено ${minorYesNo})`);
    ok(minor.includes('Да, через эмоциональную открытость') &&
       minor.includes('Нет, эмоции мешают'), 'ответы для положений разные');

    console.log('\n--- расклад ---');
    w.App.doSpread('daily');
    const spread = w.document.getElementById('spread-container').innerHTML;
    ok(spread.includes('advice-box'), 'блок совета отрисован');
    ok(spread.includes('<ul class="meaning-list">'), 'совет выводится списком');
    ok(!spread.includes('Описание отсутствует'), 'общее значение подставилось');
    ok(spread.includes('Ответ да/нет'), 'в раскладе есть ответ да/нет');

    // Сроки заполнены только у старших арканов, а «Карта дня» тянет случайную:
    // требовать их безусловно — значит получить тест, падающий через раз.
    // Поэтому сверяемся с данными выпавшей карты.
    const drawnName = (spread.match(/card-title-under">[^<]*?([А-ЯЁ][^<]*)</) || [])[1];
    const drawn = drawnName && deck.find((c) => drawnName.includes(c.name));
    if (drawn) {
        const hasTimeFrames = ['direct', 'reversed']
            .some((side) => drawn.meanings[side] && drawn.meanings[side].time_frames);
        ok(spread.includes('Сроки') === hasTimeFrames,
           `сроки в раскладе показаны ровно тогда, когда они есть в данных ` +
           `(«${drawn.name}»: ${hasTimeFrames ? 'есть' : 'нет'})`);
    } else {
        ok(false, 'не удалось определить выпавшую карту');
    }

    console.log('\n--- консоль страницы ---');
    console.log(errors.length ? '  ' + errors.join('\n  ') : '  чисто');

    dom.window.close();

    console.log(failed ? `\nПРОВАЛЕНО ПРОВЕРОК: ${failed}` : '\nВсе проверки пройдены');
    process.exit(failed ? 1 : 0);
})().catch((e) => {
    console.error('Прогон упал:', e && (e.stack || e.message || e));
    process.exit(1);
});
