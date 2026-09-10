#!/usr/bin/env node
/**
 * fetch-images.js — заменяет картинки колоды сканами Райдера — Уэйта
 * с Викисклада и записывает их происхождение в SOURCES.md.
 *
 * Зачем. Картинки, которые лежат в img/cards, пришли неизвестно откуда:
 * EXIF пустой, при 350x600 микротекст копирайта, если он там был, нечитаем.
 * Установить их происхождение по файлам невозможно, а без происхождения
 * проект нельзя ни лицензировать, ни спокойно показать как свой. Колода
 * 1909 года — общественное достояние, и её сканы лежат на Викискладе; взять
 * их оттуда дешевле, чем выяснять судьбу нынешних.
 *
 * Скрипт ничего не принимает на веру. Для каждого файла он читает лицензию
 * из ответа Викисклада и отказывается качать всё, если хоть один файл не
 * оказался общественным достоянием. SOURCES.md пишется из тех же ответов,
 * а не из головы, — то есть в нём стоит то, что Викисклад сказал сегодня.
 *
 * Запуск из корня репозитория:
 *
 *   node tools/fetch-images.js --dry-run   только проверить имена и лицензии
 *   node tools/fetch-images.js             проверить, скачать, заменить
 *   node tools/fetch-images.js --width 900 другой размер по длинной стороне
 *
 * Нужен доступ в интернет к commons.wikimedia.org. Зависимостей нет.
 *
 * Замена атомарная: файлы сначала складываются во временную папку и
 * переезжают в img/cards только когда скачаны все 78. На полпути колода
 * не окажется наполовину одной, наполовину другой.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'img', 'cards');
const STAGE_DIR = path.join(ROOT, '.image-stage');
const SOURCES = path.join(ROOT, 'SOURCES.md');
// Адрес вынесен в переменную окружения, чтобы скрипт можно было прогнать
// целиком против поддельного Викисклада: без этого проверить разбор ответов,
// отбраковку по лицензии и сборку SOURCES.md можно было бы только вживую.
const API = process.env.COMMONS_API || 'https://commons.wikimedia.org/w/api.php';
const UA = 'PolkasTarot-image-fetch/1.0 (https://github.com/deidexdd-hash/PolkasTarot)';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const WIDTH = (() => {
    const i = args.indexOf('--width');
    if (i < 0) return 720;
    const n = parseInt(args[i + 1], 10);
    // Молча подставить 720 вместо непонятного значения — значит скачать не
    // тот размер и написать в SOURCES.md неправду о том, что скачано.
    if (!Number.isFinite(n) || n < 200 || n > 4000) {
        console.error(`--width «${args[i + 1]}»: нужно целое от 200 до 4000`);
        process.exit(2);
    }
    return n;
})();

// Английские имена старших арканов — из них складываются имена файлов на
// Викискладе. Нумерация уэйтовская: Сила восьмая, Справедливость одиннадцатая.
const MAJOR_EN = [
    'Fool', 'Magician', 'High_Priestess', 'Empress', 'Emperor', 'Hierophant',
    'Lovers', 'Chariot', 'Strength', 'Hermit', 'Wheel_of_Fortune', 'Justice',
    'Hanged_Man', 'Death', 'Temperance', 'Devil', 'Tower', 'Star', 'Moon',
    'Sun', 'Judgement', 'World',
];

// Имена файлов мастей на Викискладе отличаются от наших: Pents вместо
// pentacles. Остальные совпадают с точностью до регистра.
const SUIT_COMMONS = { wands: 'Wands', cups: 'Cups', swords: 'Swords', pentacles: 'Pents' };

/**
 * Что и куда качать. Строится из data/cards.json, а не из отдельного списка:
 * иначе колода и таблица загрузки разъехались бы при первом же изменении.
 */
function plan() {
    const file = path.join(ROOT, 'data', 'cards.json');
    if (!fs.existsSync(file)) {
        throw new Error('нет data/cards.json — сначала node tools/js2json.js');
    }
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const cards = Array.isArray(raw) ? raw : raw.cards;

    return cards.map((card) => {
        const title = card.arcana === 'major'
            ? `RWS_Tarot_${String(card.number).padStart(2, '0')}_${MAJOR_EN[card.number]}.jpg`
            : `${SUIT_COMMONS[card.suit]}${String(card.number).padStart(2, '0')}.jpg`;
        return { name: card.name, code: card.code, target: path.basename(card.img), title };
    });
}

function get(url) {
    const client = url.startsWith('http://') ? http : https;
    return new Promise((resolve, reject) => {
        client.get(url, { headers: { 'User-Agent': UA } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                return resolve(get(new URL(res.headers.location, url).toString()));
            }
            if (res.statusCode !== 200) {
                res.resume();
                // 403 на api.php почти всегда значит, что запрос не выпустили
                // наружу — прокси, корпоративная сеть, песочница, — а не что
                // Викисклад отказал. Разница важная: во втором случае имеет
                // смысл править имена файлов, в первом — бесполезно.
                const hint = res.statusCode === 403
                    ? ' (запрос, похоже, не выпустили наружу: проверьте прокси или сеть)'
                    : '';
                return reject(new Error(`HTTP ${res.statusCode} на ${url.slice(0, 120)}…${hint}`));
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

/** Викисклад отдаёт не больше 50 файлов за запрос. */
async function queryBatch(titles) {
    const url = `${API}?${new URLSearchParams({
        action: 'query', format: 'json', formatversion: '2',
        titles: titles.map((t) => 'File:' + t).join('|'),
        prop: 'imageinfo',
        iiprop: 'url|size|extmetadata|mime',
        iiurlwidth: String(WIDTH),
    })}`;
    const body = JSON.parse((await get(url)).toString('utf8'));
    const out = new Map();
    for (const page of (body.query && body.query.pages) || []) {
        out.set(String(page.title).replace(/^File:/, ''), page);
    }
    return out;
}

const meta = (info, key) => {
    const em = info && info.extmetadata && info.extmetadata[key];
    return em ? String(em.value).replace(/<[^>]+>/g, '').trim() : '';
};

/**
 * Общественное ли достояние. Проверяем и короткое имя лицензии, и машинный
 * код: у части файлов заполнено только одно из двух.
 */
function isPublicDomain(info) {
    const short = meta(info, 'LicenseShortName').toLowerCase();
    const code = String((info.extmetadata && info.extmetadata.License
        && info.extmetadata.License.value) || '').toLowerCase();
    const terms = meta(info, 'UsageTerms').toLowerCase();
    return /public domain|общественное достояние/.test(short + ' ' + terms) || code === 'pd';
}

async function main() {
    const items = plan();
    console.log(`Колода: ${items.length} карт, ширина ${WIDTH} px\n`);

    console.log('1. Спрашиваю Викисклад про лицензии');
    const found = new Map();
    for (let i = 0; i < items.length; i += 50) {
        const batch = items.slice(i, i + 50);
        const pages = await queryBatch(batch.map((it) => it.title));
        for (const [title, page] of pages) found.set(title, page);
        process.stdout.write(`  ${Math.min(i + 50, items.length)}/${items.length}\r`);
    }
    console.log(`  получено ответов: ${found.size}`.padEnd(30));

    const bad = [];
    for (const item of items) {
        const page = found.get(item.title);
        if (!page || page.missing || !page.imageinfo || !page.imageinfo[0]) {
            bad.push(`${item.name}: на Викискладе нет File:${item.title}`);
            continue;
        }
        const info = page.imageinfo[0];
        item.info = info;
        if (!isPublicDomain(info)) {
            bad.push(`${item.name}: File:${item.title} — лицензия «${meta(info, 'LicenseShortName') || 'не указана'}», а нужно общественное достояние`);
        }
        if (!info.thumburl) {
            bad.push(`${item.name}: Викисклад не отдал уменьшенную копию`);
        }
    }

    if (bad.length) {
        console.log(`\nНе годится (${bad.length}):`);
        for (const b of bad) console.log('  - ' + b);
        console.log('\nНичего не скачано и не заменено.');
        console.log('Имена файлов задаются в MAJOR_EN и SUIT_COMMONS в этом же файле —');
        console.log('если Викисклад переименовал файл, поправьте там.');
        process.exit(1);
    }
    console.log('  все 78 — общественное достояние');

    if (DRY) {
        console.log('\n--dry-run: проверка пройдена, ничего не скачано.');
        const sample = items[0];
        console.log(`Пример: ${sample.name} -> ${sample.info.thumburl}`);
        console.log(`  лицензия: ${meta(sample.info, 'LicenseShortName')}`);
        console.log(`  автор:    ${meta(sample.info, 'Artist') || 'не указан'}`);
        return;
    }

    console.log('\n2. Качаю');
    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
    fs.mkdirSync(STAGE_DIR, { recursive: true });
    let bytes = 0;
    for (const [i, item] of items.entries()) {
        const data = await get(item.info.thumburl);
        if (data.length < 2048) throw new Error(`${item.name}: подозрительно маленький файл`);
        fs.writeFileSync(path.join(STAGE_DIR, item.target), data);
        bytes += data.length;
        process.stdout.write(`  ${i + 1}/${items.length}\r`);
    }
    console.log(`  скачано ${(bytes / 1048576).toFixed(1)} МБ`.padEnd(30));

    console.log('\n3. Заменяю');
    for (const item of items) {
        fs.renameSync(path.join(STAGE_DIR, item.target), path.join(IMG_DIR, item.target));
    }
    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
    console.log(`  ${items.length} файлов в img/cards`);

    console.log('\n4. Пишу SOURCES.md');
    writeSources(items);
    console.log('  готово. Проверьте данные: node tools/js2json.js --check');
}

function writeSources(items) {
    const today = new Date().toISOString().slice(0, 10);
    const lines = [
        '# Происхождение изображений',
        '',
        'Файл создан автоматически: `node tools/fetch-images.js`.',
        'Руками не правится — при следующем запуске перезапишется.',
        '',
        `Дата загрузки: ${today}. Ширина: ${WIDTH} px по длинной стороне.`,
        '',
        'Все изображения — колода Райдера — Уэйта — Смит, издана в 1909 году,',
        'общественное достояние. Лицензия каждого файла ниже взята из ответа',
        'Викисклада на момент загрузки, а не проставлена вручную.',
        '',
        '| Карта | Файл в репозитории | Викисклад | Лицензия | Автор |',
        '| --- | --- | --- | --- | --- |',
    ];
    for (const it of items) {
        const page = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(it.title)}`;
        lines.push(`| ${it.name} | \`img/cards/${it.target}\` | [${it.title}](${page}) | ` +
                   `${meta(it.info, 'LicenseShortName') || '—'} | ${meta(it.info, 'Artist') || '—'} |`);
    }
    lines.push('');
    fs.writeFileSync(SOURCES, lines.join('\n'), 'utf8');
}

main().catch((e) => {
    console.error('\nСорвалось:', e && (e.message || e));
    console.error('Если это сеть — повторите; ничего не заменено, пока не скачано всё.');
    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
    process.exit(1);
});
