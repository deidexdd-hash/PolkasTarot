/* Russian spread guides. Reading a guide never creates a diary entry. */
window.SpreadLibrary = {
    data: null, pending: null,
    filters: {query: '', category: 'all', max: 12, added: false},
    questions: {},
    categories: {situation: 'Ситуация и выбор', relationships: 'Отношения', self: 'Отношения с собой', cycles: 'Ритм и новые этапы', career: 'Работа'},
    levels: {start: 'Для начала', practice: 'Для вдумчивой практики', deep: 'Подробное исследование'},
    e(value) { return UI.escape(String(value ?? '')); },
    known(key) { return typeof key === 'string' && Object.hasOwn(Spreads.types, key); },
    async load() {
        if (this.data) return this.data;
        if (!this.pending) this.pending = fetch('data/spread-library.json').then(r => {
            if (!r.ok) throw Error('spread library');
            return r.json();
        }).then(data => {
            if (data.version !== 1 || !Array.isArray(data.items) || !Array.isArray(data.sources)) throw Error('spread library format');
            this.data = data;
            return data;
        }).finally(() => { this.pending = null; });
        return this.pending;
    },
    route(key) {
        try { history.replaceState(null, '', '#' + new URLSearchParams({layouts: key || 'contents'})); } catch (_) {}
    },
    async open(key) {
        Book.track(); Book.current = null; Book.shell();
        const root = document.getElementById('bookContent');
        root.closest('.book-shell').setAttribute('aria-label', 'Каталог раскладов');
        root.innerHTML = '<p role="status">Открываем каталог раскладов…</p>';
        this.route(this.known(key) ? key : null);
        try {
            await this.load();
            if (!root.isConnected) return;
            const item = this.known(key) && this.data.items.find(s => s.key === key);
            if (item) this.detail(root, item); else this.catalog(root);
            Book.focus();
            return true;
        } catch (_) {
            if (root.isConnected) {
                root.innerHTML = '<h2 class="book-title" tabindex="-1">Каталог пока недоступен</h2><p>Проверь соединение и попробуй ещё раз.</p><button class="primary-button" id="layoutRetry">Повторить</button>';
                root.querySelector('#layoutRetry').onclick = () => this.open(key);
            }
            return false;
        }
    },
    sourceMarkup(ids) {
        return this.data.sources.filter(s => !ids || ids.includes(s.id)).map(s => {
            let url; try { url = new URL(s.url); } catch (_) { return ''; }
            if (url.protocol !== 'https:') return '';
            return `<li><a href="${this.e(url.href)}" target="_blank" rel="noopener noreferrer">${this.e(s.title)}</a><span class="layout-source-meta">${this.e(s.publisher)} · ${this.e(s.language)}${s.publishedOrUpdated ? ' · ' + this.e(s.publishedOrUpdated) : ''}</span><p>${this.e(s.note)}</p></li>`;
        }).join('');
    },
    catalog(root) {
        this.route(null);
        root.innerHTML = `<p class="eyebrow">POLKAS · КОЛЛЕКЦИЯ 2026</p><h2 class="book-title" tabindex="-1">Расклад под твой вопрос</h2>
            <p class="book-subtitle">${this.data.items.length} схем. От одного ясного вопроса до большого круга жизни.</p>
            <p class="layout-intro">Выбери тему и удобный объём. В каждом руководстве — схема, смысл каждой позиции, пример чтения и вопросы для дневника.</p>
            <div class="layout-filters"><label for="layoutSearch">Что хочется прояснить?<input id="layoutSearch" class="academy-input" type="search" placeholder="Отношения, неделя, новолуние…" value="${this.e(this.filters.query)}"></label>
            <label for="layoutCategory">Тема<select id="layoutCategory" class="academy-input"><option value="all">Все темы</option>${Object.entries(this.categories).map(([k,v]) => `<option value="${k}" ${k === this.filters.category ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <label for="layoutMax">Объём<select id="layoutMax" class="academy-input">${[[12,'Любой · до 12 карт'],[3,'Короткий · до 3 карт'],[7,'Средний · до 7 карт']].map(([n,t]) => `<option value="${n}" ${n === this.filters.max ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
            <label class="layout-checkbox"><input id="layoutNew" type="checkbox" ${this.filters.added ? 'checked' : ''}> Только 12 новых схем</label>
            <p id="layoutCount" class="book-meta" role="status" aria-live="polite"></p><div id="layoutResults" class="layout-grid"></div>
            <details class="book-sources"><summary>Как собрана коллекция · источники на разных языках</summary><p>${this.e(this.data.research.method)}</p><p>${this.e(this.data.research.limitation)}</p><p>Языки поиска: ${this.e(this.data.research.searchedLanguages.join(', '))}.</p><ol class="layout-sources">${this.sourceMarkup()}</ol></details>`;
        root.querySelector('#layoutSearch').oninput = () => this.filter();
        ['layoutCategory','layoutMax','layoutNew'].forEach(id => { root.querySelector('#' + id).onchange = () => this.filter(); });
        this.filter();
    },
    search(query, category, max, added) {
        const normalize = text => String(text).toLocaleLowerCase('ru').replace(/ё/g, 'е');
        const words = normalize(query).trim().split(/\s+/).filter(Boolean);
        return this.data.items.filter(s => {
            const text = normalize([s.title, this.categories[s.category], s.intro, s.when, ...s.questions,
                ...s.positions.map(p => [p.label, p.meaning, p.question, p.example.name].join(' '))].join(' '));
            return (category === 'all' || s.category === category) && s.positions.length <= max && (!added || s.added) && words.every(w => text.includes(w));
        });
    },
    filter() {
        const field = document.getElementById('layoutSearch'); if (!field) return;
        this.filters = {query: field.value, category: document.getElementById('layoutCategory').value,
            max: Number(document.getElementById('layoutMax').value), added: document.getElementById('layoutNew').checked};
        const f = this.filters, items = this.search(f.query, f.category, f.max, f.added);
        document.getElementById('layoutCount').textContent = `Найдено: ${items.length} из ${this.data.items.length}`;
        const results = document.getElementById('layoutResults');
        results.innerHTML = items.map(s => `<button class="layout-tile" data-layout="${this.e(s.key)}"><span class="layout-tile-meta">${this.e(this.categories[s.category])} ${s.added ? '<span class="layout-new">Добавлено</span>' : ''}</span><strong>${this.e(s.title)}</strong><span>${this.e(Spreads.types[s.key].description)}</span><small>${this.cardCount(s.positions.length)} · около ${s.minutes} мин <span aria-hidden="true">↗</span></small></button>`).join('') || '<p>Совпадений нет. Попробуй другое слово или убери фильтры.</p><button class="text-btn" id="layoutReset">Сбросить фильтры</button>';
        results.querySelectorAll('[data-layout]').forEach(b => { b.onclick = () => this.open(b.dataset.layout); });
        const reset = results.querySelector('#layoutReset'); if (reset) reset.onclick = () => {
            this.filters = {query: '', category: 'all', max: 12, added: false}; this.catalog(document.getElementById('bookContent'));
        };
    },
    cardCount(n) { return `${n} ${n === 1 ? 'карта' : n < 5 ? 'карты' : 'карт'}`; },
    diagram(item) {
        const cols = Math.max(...item.positions.map(p => p.col)), rows = Math.max(...item.positions.map(p => p.row));
        return `<figure class="layout-diagram"><svg viewBox="0 0 ${cols * 76} ${rows * 100}" role="img" aria-label="${this.e('Схема «' + item.title + '». Номера соответствуют списку позиций ниже.')}">${item.positions.map((p,i) => `<g transform="translate(${(p.col - 1) * 76 + 10} ${(p.row - 1) * 100 + 8})"><rect width="56" height="84" rx="7"/><text x="28" y="49" text-anchor="middle">${i + 1}</text></g>`).join('')}</svg><figcaption>Открывай карты по номерам. На узком экране сам расклад показан по порядку; эта схема сохраняет расположение на столе.</figcaption></figure>`;
    },
    list(items) { return `<ol class="layout-steps">${items.map(t => `<li>${this.e(t)}</li>`).join('')}</ol>`; },
    detail(root, item) {
        const key = item.key;
        root.innerHTML = `<button class="text-btn" id="layoutBack">← Все расклады</button><p class="eyebrow">${this.e(this.categories[item.category])}</p><h2 class="book-title layout-title" tabindex="-1">${this.e(item.title)}</h2>
            <p class="book-meta">${this.cardCount(item.positions.length)} · около ${item.minutes} мин · ${this.e(this.levels[item.level])}</p><p class="author-lead">${this.e(item.intro)}</p>
            <h3 class="author-section-title">Когда выбрать эту схему</h3><p class="layout-intro">${this.e(item.when)}</p>
            <section class="layout-start" aria-labelledby="layoutStartTitle"><h3 id="layoutStartTitle">Твой вопрос</h3><p>Можно взять один из вариантов и переписать его под себя.</p><div class="layout-presets">${item.questions.map((q,i) => `<button class="text-btn" data-question="${i}">${this.e(q)}</button>`).join('')}</div>
            <label for="layoutQuestion">Вопрос для моего расклада</label><textarea id="layoutQuestion" class="academy-input" rows="3" maxlength="200">${this.e(this.questions[key] ?? item.questions[0])}</textarea>
            <div class="book-actions"><button class="primary-button" id="layoutDraw">Открыть карты</button><button class="text-btn" id="layoutManual">У меня своя колода</button></div><p class="book-meta">Карты можно открыть на сайте или ввести из своей колоды. Расклад сохранится в дневнике.</p></section>
            <h3 class="author-section-title">Перед началом</h3>${this.list(this.data.preparation)}
            <h3 class="author-section-title">Схема и позиции</h3>${this.diagram(item)}
            <ol class="layout-positions">${item.positions.map((p,i) => `<li><h4>${i + 1}. ${this.e(p.label)}</h4><p>${this.e(p.meaning)}</p><p class="layout-position-question">${this.e(p.question)}</p></li>`).join('')}</ol>
            <h3 class="author-section-title">Как собрать чтение</h3>${this.list(item.reading)}
            <details class="layout-details"><summary>Перевёрнутые карты</summary><p>${this.e(this.data.reversals)}</p></details>
            <h3 class="author-section-title">Что может запутать</h3><ul class="layout-steps">${item.pitfalls.map(p => `<li>${this.e(p)}</li>`).join('')}</ul>
            <details class="layout-details layout-example"><summary>Учебный пример · ${this.cardCount(item.positions.length)}</summary><p>Ситуация и карты в этом примере придуманы для обучения. Это один из возможных способов чтения.</p><p>${this.e(item.example.scenario)}</p>
            <ol class="author-positions">${item.positions.map((p,i) => `<li><h4>${i + 1}. ${this.e(p.label)}</h4><div class="author-position-content"><button class="author-card-link" data-example="${i}"><img src="${this.e(p.example.img)}" alt="${this.e(p.example.name)}" loading="lazy" width="112" height="192"><span>${this.e(p.example.name)}</span></button><p>${this.e(p.example.reading)}</p></div></li>`).join('')}</ol>
            <h4>Связь карт и небольшой шаг</h4><p>${this.e(item.example.synthesis)}</p><h4>Другая версия</h4><p>${this.e(item.example.alternative)}</p></details>
            <h3 class="author-section-title">Что записать в дневник</h3>${this.list(item.journal)}<p class="layout-intro">После своего расклада запиши первую мысль и выбранный шаг. Позже дополни поле «Что изменилось позже?».</p>
            <div class="book-actions"><button class="primary-button" id="layoutStartAgain">Перейти к своему вопросу ↑</button>${item.bookCase ? '<button class="text-btn" id="layoutBookCase">Разбор в «Карте как зеркале» ↗</button>' : ''}</div>
            <details class="book-sources"><summary>Происхождение схемы и материалы</summary><p>${this.e(item.origin)}</p><ol class="layout-sources">${this.sourceMarkup(item.sources)}</ol></details>`;
        root.querySelector('#layoutBack').onclick = () => this.open();
        const question = root.querySelector('#layoutQuestion');
        question.oninput = () => { this.questions[key] = question.value.slice(0, 200); };
        root.querySelectorAll('[data-question]').forEach(b => { b.onclick = () => {
            question.value = item.questions[Number(b.dataset.question)]; question.oninput(); question.focus({preventScroll: true});
        }; });
        root.querySelector('#layoutDraw').onclick = () => this.start(key, false);
        root.querySelector('#layoutManual').onclick = () => this.start(key, true);
        root.querySelector('#layoutStartAgain').onclick = () => { question.focus({preventScroll: true}); question.scrollIntoView({block: 'center'}); };
        root.querySelectorAll('[data-example]').forEach(b => { b.onclick = () => {
            if (App.deckReady()) Academy.detail(item.positions[Number(b.dataset.example)].example.card);
        }; });
        if (item.bookCase) root.querySelector('#layoutBookCase').onclick = () => Author.open('cases', item.bookCase);
    },
    start(key, manual) {
        if (!this.known(key) || !App.deckReady()) return;
        const question = (document.getElementById('layoutQuestion')?.value || '').trim().slice(0, 200);
        this.questions[key] = question;
        if (!manual) { App.doSpread(key, {question}); return; }
        Journal.showManual();
        document.getElementById('manualSpread').value = key; Journal.manualFields();
        document.getElementById('manualQuestion').value = question;
    },
    async annotate(config, table, blocks, banner) {
        try {
            const data = await this.load(); if (!table.isConnected) return;
            const item = data.items.find(s => s.key === config.key);
            // Imported diary entries keep their own layout snapshot. Only attach
            // current guidance when every saved position still agrees with it.
            if (!item || blocks.length !== item.positions.length || !Array.isArray(config.labels) ||
                !item.positions.every((p,i) => p.label === config.labels[i])) return;
            blocks.forEach((block,i) => {
                const p = item.positions[i], hint = document.createElement('section'); hint.className = 'layout-reading-position';
                hint.innerHTML = `<h4>${i + 1}. ${this.e(p.label)}</h4><p>${this.e(p.meaning)}</p><p>${this.e(p.question)}</p>`;
                block.querySelector('h3').after(hint);
            });
            const notes = document.createElement('details'); notes.className = 'layout-details';
            notes.innerHTML = `<summary>Вопросы для дневника к этому раскладу</summary>${this.list(item.journal)}`;
            banner.appendChild(notes);
        } catch (_) { /* The reading and diary remain usable; the guide offers retry. */ }
    }
};

const spreadLibraryRender = UI.renderSpread.bind(UI);
UI.renderSpread = function(title, cards, config, meta) {
    spreadLibraryRender(title, cards, config, meta);
    if (!SpreadLibrary.known(config.key)) return;
    const root = document.getElementById('spread-container'), table = root?.querySelector('.spread-table');
    if (!table) return;
    const banner = document.createElement('section'); banner.className = 'layout-reading-guide';
    const button = document.createElement('button'); button.className = 'text-btn'; button.textContent = 'Схема и подробное руководство ↗';
    button.onclick = () => {
        const record = State.history.find(s => s.id === Journal.currentId && s.spreadKey === config.key);
        if (record) SpreadLibrary.questions[config.key] = record.question || '';
        SpreadLibrary.open(config.key);
    };
    banner.appendChild(button); table.before(banner);
    SpreadLibrary.annotate(config, table, Array.from(root.querySelectorAll('.info-block')), banner);
};
