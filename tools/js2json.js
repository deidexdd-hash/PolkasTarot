#!/usr/bin/env node
/**
 * js2json.js — конвертер данных PolkasTarot из js/data/*.js в чистый JSON.
 *
 * Зачем:
 *   1. js/data/major.js сейчас НЕ ПАРСИТСЯ браузером: внутри строк остались
 *      неэкранированные кавычки. В рантайме window.TarotDB.major остаётся
 *      пустым, и колода собирается из 56 карт вместо 78 (Старших арканов нет
 *      ни в раскладах, ни в галерее). Скрипт чинит это.
 *   2. Данные лежат в .js как глобальные window.* — их нельзя переиспользовать
 *      ни в боте, ни в другом приложении, ни отдать наружу. Скрипт выгружает
 *      их в нормальный JSON с единой схемой для старших и младших арканов.
 *
 * Запуск (Node 16+, без зависимостей), из корня репозитория:
 *
 *   node tools/js2json.js               — собрать data/*.json
 *   node tools/js2json.js --fix-source  — ещё и переписать js/data/*.js
 *                                         с экранированными кавычками
 *   node tools/js2json.js --check       — только проверить, ничего не писать
 *                                         (exit 1, если есть проблемы)
 *   node tools/js2json.js --csv         — дополнительно выгрузить data/cards.csv
 *
 * Флаги можно комбинировать: node tools/js2json.js --fix-source --csv
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------------------------------------------------------------------------
// Конфигурация
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'js', 'data');
const OUT_DIR = path.join(ROOT, 'data');
const IMG_DIR = path.join(ROOT, 'img', 'cards');

const SUITS = ['wands', 'cups', 'swords', 'pentacles'];

// В img/cards пентакли названы pents*, а не pentacles* — держим отдельную карту.
const SUIT_IMG_PREFIX = {
    wands: 'wands',
    cups: 'cups',
    swords: 'swords',
    pentacles: 'pents',
};

const SUIT_RU = {
    wands: 'Жезлы',
    cups: 'Кубки',
    swords: 'Мечи',
    pentacles: 'Пентакли',
};

// Канонические имена рангов — по спецификации arcanaland/specifications,
// чтобы данные можно было состыковать с чужими колодами и наборами значений.
const RANKS = [
    'ace', 'two', 'three', 'four', 'five', 'six', 'seven',
    'eight', 'nine', 'ten', 'page', 'knight', 'queen', 'king',
];

// Поля значений. Единая схема: то, чего нет у младших арканов, становится null,
// а не отсутствует — так потребителю данных не нужно проверять наличие ключа.
const TEXT_FIELDS = [
    'symbolism', 'general', 'love', 'relations', 'work',
    'finance', 'health', 'psychological', 'spiritual', 'time_frames', 'yes_no',
];
const LIST_FIELDS = ['advice', 'combinations'];

const FILES = ['major', ...SUITS];

const args = new Set(process.argv.slice(2));
const FIX_SOURCE = args.has('--fix-source');
const CHECK_ONLY = args.has('--check');
const WANT_CSV = args.has('--csv');

const problems = [];
const notes = [];
const remapped = [];

// ---------------------------------------------------------------------------
// Шаг 1. Починка исходников
// ---------------------------------------------------------------------------

/**
 * Файлы js/data/*.js написаны построчно и предельно регулярно:
 *
 *     name:  "Шут ",
 *     advice: [
 *      "Позвольте себе попробовать что-то новое. ",
 *     ]
 *
 * Строковое значение всегда целиком на одной строке. Значит, для каждой такой
 * строки можно надёжно взять всё между ПЕРВОЙ и ПОСЛЕДНЕЙ кавычкой — это тело
 * строки — и заэкранировать кавычки внутри него. Именно из-за них
 * (текст вида: рождения нового "я") major.js сейчас не парсится.
 */
const RE_ASSIGN_STR = /^(\s*[A-Za-z_]\w*\s*:\s*)"(.*)"(\s*,?\s*)$/;
const RE_ARRAY_ITEM = /^(\s*)"(.*)"(\s*,?\s*)$/;

const SENTINEL = '\u0000';

function repairSource(code, fileLabel) {
    let fixed = 0;
    const out = code.split('\n').map((line, idx) => {
        const m = line.match(RE_ASSIGN_STR) || line.match(RE_ARRAY_ITEM);
        if (!m) return line;

        const [, head, body, tail] = m;

        // Уже экранированные кавычки прячем под сентинел, «голые» экранируем,
        // затем возвращаем спрятанные. Так \" не превращается в \\".
        const hidden = body.split('\\"').join(SENTINEL);
        const bare = (hidden.match(/"/g) || []).length;
        const escaped = hidden.split('"').join('\\"').split(SENTINEL).join('\\"');

        if (bare > 0) {
            fixed += bare;
            notes.push(`${fileLabel}:${idx + 1} — заэкранировано кавычек: ${bare}`);
        }
        return `${head}"${escaped}"${tail}`;
    }).join('\n');

    return { code: out, fixed };
}

/**
 * В файлах мастей у всех четырнадцати карт в поле img стоит картинка туза:
 * у каждого Кубка — cups01.jpg, у каждого Жезла — wands01.jpg. Файлы
 * cups02..cups14 при этом лежат в img/cards и никем не используются.
 *
 * В каждом файле масти ровно одна строка `img:` на карту и карты идут по
 * порядку, поэтому N-я строка img принадлежит N-й карте. Этого достаточно,
 * чтобы расставить пути без разбора всего файла.
 */
const RE_IMG_LINE = /^(\s*img\s*:\s*)"([^"]*)"(\s*,?\s*)$/;

function repairImages(code, suit) {
    const prefix = SUIT_IMG_PREFIX[suit];
    let index = 0;
    let changed = 0;

    const out = code.split('\n').map((line) => {
        const m = line.match(RE_IMG_LINE);
        if (!m) return line;

        index += 1;
        const [, head, current, tail] = m;
        const want = `img/cards/${prefix}${String(index).padStart(2, '0')}.jpg`;

        // Ставим путь, только если такой файл действительно есть.
        if (!fs.existsSync(path.join(ROOT, want))) return line;
        if (current.trim() === want) return line;

        changed += 1;
        return `${head}"${want}"${tail}`;
    }).join('\n');

    return { code: out, changed };
}

/**
 * Генератор оставил хвостовые пробелы внутри кавычек: name: "Шут " и
 * img: "img/cards/maj00.jpg ". На экспорт это не влияет (clean() подтягивает
 * пробелы), но в браузере данные берутся из .js напрямую: имя выводится с
 * пробелом, а путь с пробелом на конце даёт 404 — все 17 старших арканов
 * выпадают без картинки. Чиним в исходнике, для всех файлов сразу.
 */
const RE_SCALAR_LINE = /^(\s*(?:name|img)\s*:\s*)"([^"]*)"(\s*,?\s*)$/;

function repairScalarSpaces(code, fileLabel) {
    let changed = 0;

    const out = code.split('\n').map((line, idx) => {
        const m = line.match(RE_SCALAR_LINE);
        if (!m) return line;

        const [, head, body, tail] = m;
        const want = body.trim();
        if (want === body) return line;

        changed += 1;
        notes.push(`${fileLabel}:${idx + 1} — подтянуты пробелы: "${body}" -> "${want}"`);
        return `${head}"${want}"${tail}`;
    }).join('\n');

    return { code: out, changed };
}

// ---------------------------------------------------------------------------
// Шаг 2. Загрузка данных
// ---------------------------------------------------------------------------

function loadDb() {
    const sandbox = {
        window: {
            TarotDB: {
                major: [],
                minor: { wands: [], cups: [], swords: [], pentacles: [] },
            },
        },
        console: { log() {}, error() {}, warn() {} },
    };
    const context = vm.createContext(sandbox);

    let totalFixed = 0;
    let totalImages = 0;
    let totalSpaces = 0;

    for (const name of FILES) {
        const file = path.join(SRC_DIR, `${name}.js`);
        if (!fs.existsSync(file)) {
            problems.push(`нет файла js/data/${name}.js`);
            continue;
        }

        const raw = fs.readFileSync(file, 'utf8');
        let { code, fixed } = repairSource(raw, `js/data/${name}.js`);
        totalFixed += fixed;

        const spaces = repairScalarSpaces(code, `js/data/${name}.js`);
        code = spaces.code;
        totalSpaces += spaces.changed;

        let imgChanged = 0;
        if (SUITS.includes(name)) {
            const result = repairImages(code, name);
            code = result.code;
            imgChanged = result.changed;
            totalImages += imgChanged;
        }

        if (fixed > 0) console.log(`  js/data/${name}.js — починено кавычек: ${fixed}`);
        if (spaces.changed > 0) console.log(`  js/data/${name}.js — подтянуто пробелов в name/img: ${spaces.changed}`);
        if (imgChanged > 0) console.log(`  js/data/${name}.js — исправлено путей к картинкам: ${imgChanged}`);

        if ((fixed > 0 || imgChanged > 0 || spaces.changed > 0) && FIX_SOURCE && !CHECK_ONLY) {
            fs.writeFileSync(file, code, 'utf8');
            console.log(`  js/data/${name}.js — исходник перезаписан`);
        }

        try {
            vm.runInContext(code, context, { filename: file });
        } catch (err) {
            problems.push(`js/data/${name}.js не парсится даже после починки: ${err.message}`);
        }
    }

    return { db: sandbox.window.TarotDB, totalFixed, totalImages, totalSpaces };
}

/**
 * js/data/tarot_raw.js — более ранний, менее подробный, но ПОЛНЫЙ набор из 78
 * карт. Он объявлен как `const tarotDB`, в index.html не подключён и в рантайме
 * не используется. Мы читаем его как резерв: в major.js данные обрываются на
 * Башне (id 16), и Звезда, Луна, Солнце, Суд и Мир берутся отсюда.
 */
function loadRaw() {
    const file = path.join(SRC_DIR, 'tarot_raw.js');
    if (!fs.existsSync(file)) return null;

    const raw = fs.readFileSync(file, 'utf8');
    const { code } = repairSource(raw, 'js/data/tarot_raw.js');
    const sandbox = { console: { log() {}, error() {}, warn() {} }, result: null };
    const context = vm.createContext(sandbox);

    try {
        vm.runInContext(
            `result = (function () {\n${code}\nreturn typeof tarotDB !== 'undefined' ? tarotDB : null;\n})();`,
            context,
            { filename: file }
        );
    } catch (err) {
        problems.push(`js/data/tarot_raw.js не парсится: ${err.message}`);
        return null;
    }
    return sandbox.result;
}

// ---------------------------------------------------------------------------
// Шаг 3. Нормализация
// ---------------------------------------------------------------------------

function clean(value) {
    if (value == null) return null;
    const text = String(value)
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')            // хвостовые пробелы перед переносом
        .replace(/[ \t]{2,}/g, ' ')             // склейка двойных пробелов
        // Генератор данных обрамил каждую внутреннюю кавычку пробелами:
        // рождения нового " я " -> рождения нового "я". Подтягиваем только
        // парные кавычки, непарные не трогаем.
        .replace(/"([^"]*)"/g, (_, inner) => `"${inner.trim()}"`)
        .replace(/ +([,.;:!?])/g, '$1')         // пробел перед знаком препинания
        .trim();
    return text.length ? text : null;
}

function toList(value) {
    if (value == null) return [];
    const list = Array.isArray(value) ? value : [value];
    return list.map(clean).filter(Boolean);
}

function normalizeSide(side) {
    const src = side || {};
    const out = {};
    for (const field of TEXT_FIELDS) out[field] = clean(src[field]);
    for (const field of LIST_FIELDS) out[field] = toList(src[field]);
    return out;
}

function normalizeCard(card, meta) {
    const name = clean(card.name);
    if (!name) problems.push(`карта ${meta.id}: пустое имя`);

    let img = clean(card.img);
    if (img) img = img.replace(/\\/g, '/').replace(/^\.\//, '');

    // Ожидаемое имя файла по позиции карты в колоде.
    const local = meta.arcana === 'major'
        ? `img/cards/maj${String(meta.id).padStart(2, '0')}.jpg`
        : `img/cards/${SUIT_IMG_PREFIX[meta.suit]}${String(meta.number).padStart(2, '0')}.jpg`;
    const localExists = fs.existsSync(path.join(ROOT, local));

    // Две поломки разом:
    //   1. в резервном файле картинки — внешние ссылки на Wikimedia;
    //   2. во всех 56 младших арканах img указывает на туза своей масти
    //      (у всех Кубков стоит cups01.jpg), хотя cups02..cups14 лежат рядом.
    // Если файл, положенный карте по позиции, существует — ставим его.
    if (localExists && (!img || /^https?:/i.test(img) || img !== local)) {
        if (img && img !== local && !/^https?:/i.test(img)) {
            remapped.push(`${name}: ${img} -> ${local}`);
        }
        img = local;
    }
    if (!img) problems.push(`${name || meta.id}: не указана картинка`);

    return {
        id: meta.id,
        code: meta.code,
        source: meta.source,      // из какого файла взята карта
        detail: meta.detail,      // full — подробное толкование, short — краткое
        name,
        name_en: null,          // задел под перевод — заполняется вручную
        arcana: meta.arcana,
        suit: meta.suit,
        suit_ru: meta.suit ? SUIT_RU[meta.suit] : null,
        number: meta.number,
        rank: meta.rank,
        img,
        meanings: {
            direct: normalizeSide(card.meanings && card.meanings.direct),
            reversed: normalizeSide(card.meanings && card.meanings.reversed),
        },
    };
}

function build(db, raw) {
    const cards = [];

    // --- Старшие арканы: id 0-21 -------------------------------------------
    const majorById = new Map();
    for (const card of db.major) {
        const id = typeof card.id === 'number' ? card.id : majorById.size;
        majorById.set(id, { card, source: 'js/data/major.js', detail: 'full' });
    }

    // Пробелы закрываем из резервного файла.
    const rawMajor = (raw && raw.major) || [];
    for (const card of rawMajor) {
        const id = typeof card.id === 'number' ? card.id : null;
        if (id == null || majorById.has(id)) continue;
        majorById.set(id, { card, source: 'js/data/tarot_raw.js', detail: 'short' });
    }

    for (let id = 0; id <= 21; id += 1) {
        const entry = majorById.get(id);
        if (!entry) {
            problems.push(`старший аркан id ${id} отсутствует и в major.js, и в tarot_raw.js`);
            continue;
        }
        cards.push(normalizeCard(entry.card, {
            id,
            code: `major_arcana.${String(id).padStart(2, '0')}`,
            arcana: 'major',
            suit: null,
            number: id,
            rank: null,
            source: entry.source,
            detail: entry.detail,
        }));
    }

    // --- Младшие арканы: id 22-77, жезлы -> кубки -> мечи -> пентакли ------
    let nextId = 22;
    for (const suit of SUITS) {
        let list = db.minor[suit] || [];
        let source = `js/data/${suit}.js`;
        if (!list.length && raw && raw.minor && raw.minor[suit]) {
            list = raw.minor[suit];
            source = 'js/data/tarot_raw.js';
        }
        if (list.length !== 14) {
            problems.push(`${SUIT_RU[suit]}: карт ${list.length}, а должно быть 14`);
        }
        list.forEach((card, index) => {
            cards.push(normalizeCard(card, {
                id: nextId++,
                code: `minor_arcana.${suit}.${RANKS[index] || `n${index + 1}`}`,
                arcana: 'minor',
                suit,
                number: index + 1,
                rank: RANKS[index] || null,
                source,
                detail: 'short',
            }));
        });
    }

    return cards;
}

// ---------------------------------------------------------------------------
// Шаг 4. Валидация
// ---------------------------------------------------------------------------

function validate(cards) {
    if (cards.length !== 78) {
        problems.push(`карт ${cards.length}, а должно быть 78`);
    }

    const byId = new Map();
    const byName = new Map();

    for (const card of cards) {
        if (byId.has(card.id)) problems.push(`дубль id ${card.id}: ${card.name} и ${byId.get(card.id)}`);
        byId.set(card.id, card.name);

        if (card.name) {
            if (byName.has(card.name)) problems.push(`дубль имени «${card.name}»`);
            byName.set(card.name, card.id);
        }

        for (const side of ['direct', 'reversed']) {
            if (!card.meanings[side].general) {
                problems.push(`${card.name} (${side}): пустое поле general`);
            }
        }

        if (card.img && fs.existsSync(IMG_DIR)) {
            const file = path.join(ROOT, card.img);
            if (!fs.existsSync(file)) {
                problems.push(`${card.name}: файл ${card.img} не найден`);
            }
        }
    }
}

function coverage(cards) {
    const rows = [];
    for (const field of [...TEXT_FIELDS, ...LIST_FIELDS]) {
        let filled = 0;
        for (const card of cards) {
            const d = card.meanings.direct[field];
            const r = card.meanings.reversed[field];
            const has = (v) => Array.isArray(v) ? v.length > 0 : Boolean(v);
            if (has(d) || has(r)) filled += 1;
        }
        rows.push({ field, filled, total: cards.length });
    }
    return rows;
}

// ---------------------------------------------------------------------------
// Шаг 5. Выгрузка
// ---------------------------------------------------------------------------

function csvEscape(value) {
    const text = value == null ? '' : Array.isArray(value) ? value.join(' | ') : String(value);
    return `"${text.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
}

function writeCsv(cards, file) {
    const cols = ['id', 'code', 'name', 'arcana', 'suit', 'number', 'img'];
    const sideCols = [...TEXT_FIELDS, ...LIST_FIELDS];
    const header = [...cols, ...sideCols.map((f) => `direct_${f}`), ...sideCols.map((f) => `reversed_${f}`)];

    const lines = [header.join(',')];
    for (const card of cards) {
        const row = [
            ...cols.map((c) => csvEscape(card[c])),
            ...sideCols.map((f) => csvEscape(card.meanings.direct[f])),
            ...sideCols.map((f) => csvEscape(card.meanings.reversed[f])),
        ];
        lines.push(row.join(','));
    }
    fs.writeFileSync(file, `﻿${lines.join('\n')}\n`, 'utf8');
}

function writeOutputs(cards) {
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const payload = {
        name: 'PolkasTarot — значения карт Таро на русском',
        deck: 'Rider-Waite-Smith',
        language: 'ru',
        version: new Date().toISOString().slice(0, 10),
        count: cards.length,
        cards,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'cards.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(OUT_DIR, 'cards.min.json'), JSON.stringify(payload), 'utf8');

    // Построчный JSONL — удобно грузить в датасеты и RAG.
    fs.writeFileSync(
        path.join(OUT_DIR, 'cards.jsonl'),
        cards.map((c) => JSON.stringify(c)).join('\n') + '\n',
        'utf8'
    );

    // Разрезка по группам — чтобы фронт мог грузить только нужное.
    const groups = { major: cards.filter((c) => c.arcana === 'major') };
    for (const suit of SUITS) groups[suit] = cards.filter((c) => c.suit === suit);
    for (const [key, list] of Object.entries(groups)) {
        fs.writeFileSync(path.join(OUT_DIR, `${key}.json`), JSON.stringify(list, null, 2) + '\n', 'utf8');
    }

    // Лёгкий индекс для галереи: имя + картинка + пара ключевых слов.
    const index = cards.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        arcana: c.arcana,
        suit: c.suit,
        img: c.img,
    }));
    fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');

    if (WANT_CSV) writeCsv(cards, path.join(OUT_DIR, 'cards.csv'));

    return Object.keys(groups);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
    console.log('PolkasTarot — конвертер js/data → JSON\n');

    console.log('1. Читаю и чиню исходники');
    const { db, totalFixed, totalImages, totalSpaces } = loadDb();
    if (totalFixed === 0 && totalImages === 0 && totalSpaces === 0) console.log('  исходники в порядке, чинить нечего');

    const raw = loadRaw();

    console.log('\n2. Нормализую');
    const cards = build(db, raw);
    console.log(`  старших арканов: ${cards.filter((c) => c.arcana === 'major').length}`);
    for (const suit of SUITS) {
        console.log(`  ${SUIT_RU[suit]}: ${cards.filter((c) => c.suit === suit).length}`);
    }

    const short = cards.filter((c) => c.arcana === 'major' && c.detail === 'short');
    if (short.length) {
        console.log(`  из них взяты из резервного tarot_raw.js (краткие толкования): ${short.length}`);
        for (const c of short) console.log(`    - ${c.id} ${c.name}`);
    }

    if (remapped.length) {
        console.log(`  переназначено картинок: ${remapped.length}`);
        console.log(`    (например: ${remapped[0]})`);
    }

    console.log('\n3. Проверяю');
    validate(cards);

    console.log('\n  Заполненность полей (карт из 78, где поле есть хотя бы в одном положении):');
    for (const row of coverage(cards)) {
        const bar = '#'.repeat(Math.round((row.filled / (row.total || 1)) * 20)).padEnd(20, '.');
        console.log(`    ${row.field.padEnd(14)} ${bar} ${row.filled}/${row.total}`);
    }

    if (problems.length) {
        console.log(`\n  Проблемы (${problems.length}):`);
        for (const p of problems.slice(0, 40)) console.log(`    - ${p}`);
        if (problems.length > 40) console.log(`    ... и ещё ${problems.length - 40}`);
    } else {
        console.log('\n  Проблем не найдено');
    }

    if (CHECK_ONLY) {
        // Проверка выше прогоняется по данным, ПОЧИНЕННЫМ В ПАМЯТИ. Браузер
        // читает js/data/*.js как есть, поэтому нетронутый исходник — такая же
        // поломка, как невалидные данные, и --check обязан её завалить.
        const dirty = totalFixed + totalImages + totalSpaces;
        if (dirty > 0) {
            console.log(`\n  Исходники в js/data/ требуют починки (${dirty} значений):`);
            if (totalFixed > 0) console.log(`    - неэкранированных кавычек: ${totalFixed}`);
            if (totalSpaces > 0) console.log(`    - хвостовых пробелов в name/img: ${totalSpaces}`);
            if (totalImages > 0) console.log(`    - карт с чужой картинкой: ${totalImages}`);
            console.log('  Почините: node tools/js2json.js --fix-source');
        }

        console.log('\nРежим --check: ничего не записано');
        process.exit(problems.length || dirty > 0 ? 1 : 0);
    }

    console.log('\n4. Записываю');
    const groups = writeOutputs(cards);
    console.log(`  data/cards.json, cards.min.json, cards.jsonl, index.json`);
    console.log(`  data/${groups.join('.json, ')}.json`);
    if (WANT_CSV) console.log('  data/cards.csv');

    if ((totalFixed > 0 || totalImages > 0 || totalSpaces > 0) && !FIX_SOURCE) {
        const lines = ['\nВНИМАНИЕ: исходники в js/data/ остались как были.'];
        if (totalFixed > 0) {
            lines.push(`  ${totalFixed} неэкранированных кавычек — пока они там, major.js не грузится`);
            lines.push('  в браузере и колода собирается из 56 карт.');
        }
        if (totalImages > 0) {
            lines.push(`  ${totalImages} карт указывают не на свою картинку.`);
        }
        if (totalSpaces > 0) {
            lines.push(`  ${totalSpaces} значений name/img с хвостовым пробелом — из-за пробела`);
            lines.push('  в конце пути картинки старших арканов не грузятся в браузере.');
        }
        lines.push('Почините исходники: node tools/js2json.js --fix-source');
        console.log(lines.join('\n'));
    }

    console.log('\nГотово.');
    process.exit(problems.length ? 1 : 0);
}

main();
