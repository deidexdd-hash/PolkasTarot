/* Shared editorial presentation. Existing readers and local data remain the source of truth. */
window.Editorial = {
    scenes: {
        reading: ['reading-table', 'Карты и зеркало на тёплом камне', 'РАСКЛАДЫ И НАБЛЮДЕНИЯ', 'Один вопрос. Несколько ракурсов. Пространство для твоего прочтения.'],
        layouts: ['reading-table', 'Светлые карты на тёмной ткани', 'КОЛЛЕКЦИЯ РАСКЛАДОВ', 'Выбери тему и глубину. У каждой схемы — свой способ посмотреть на ситуацию.'],
        deck: ['atlas-symbols', 'Лупа, карты и оливковая ветвь', 'АТЛАС ОБРАЗОВ', 'Замечай детали, исследуй символы и сохраняй собственные ассоциации.'],
        study: ['study-pages', 'Открытая книга и записи за деревянным столом', 'ИЗУЧЕНИЕ И ПРАКТИКА', 'От первого впечатления — к уверенному и внимательному чтению.'],
        train: ['morning-pause', 'Карта и чашка у утреннего окна', 'НЕБОЛЬШАЯ ПРАКТИКА', 'Сначала твой взгляд. Потом — подсказка и новое наблюдение.'],
        compare: ['atlas-symbols', 'Предметы и карты для внимательного изучения', 'ДВА РАКУРСА', 'Ищи сходства, замечай различия и пробуй соединять смыслы.'],
        book: ['mirror-book', 'Книга «Карта как зеркало» рядом с зеркалом', 'АВТОРСКАЯ КНИГА', 'Читай в своём темпе. Возвращайся к тому, что отозвалось.'],
        author: ['study-pages', 'Книга, карандаш и карты на столе', 'ПРОДОЛЖЕНИЕ КНИГИ', 'Образы, уроки и упражнения, которые становятся личным опытом.'],
        mirror: ['morning-pause', 'Одна карта в тёплом утреннем свете', 'ПРАКТИКА «ЗЕРКАЛО»', 'Образ, ассоциация и один небольшой шаг для себя.'],
        daily: ['morning-pause', 'Карта на льняной салфетке у окна', 'МОЯ ЕЖЕДНЕВНАЯ ПРАКТИКА', 'Небольшая пауза, чтобы услышать себя и заметить свой день.'],
        journal: ['personal-journal', 'Открытый дневник и рука с пером', 'МОЙ ЛИЧНЫЙ ДНЕВНИК', 'Сохраняй мысли. Возвращайся к вопросам. Замечай, что изменилось.'],
        stats: ['personal-journal', 'Записи в дневнике на деревянном столе', 'МОЙ ОПЫТ', 'Карты и темы, к которым ты возвращаешься. История твоей практики.'],
        manual: ['reading-table', 'Карты, разложенные на столе', 'МОЯ КОЛОДА', 'Оставь карты перед собой, а свои наблюдения — здесь.']
    },
    photo(key, {lazy = false, compact = false} = {}) {
        const scene = this.scenes[key] || this.scenes.study;
        const img = document.createElement('img');
        img.className = 'editorial-photo'; img.src = `img/editorial/${scene[0]}-1280.webp`;
        img.srcset = `img/editorial/${scene[0]}-640.webp 640w, img/editorial/${scene[0]}-1280.webp 1280w`;
        img.sizes = compact ? '(max-width: 699px) 104px, 220px' : '(max-width: 699px) calc(100vw - 44px), 520px';
        img.width = 1280; img.height = 853; img.alt = scene[1]; img.decoding = 'async';
        img.loading = lazy ? 'lazy' : 'eager';
        return img;
    },
    page(key) {
        document.body.dataset.page = key;
        const section = ['deck','daily','journal'].includes(key) ? key : ['study','train','compare','book','author','mirror','stats'].includes(key) ? 'academy' : null;
        Daily.select(section);
        Home.theme();
    },
    decorate(key, {root, compact = false, text} = {}) {
        const area = root || document.getElementById('spread-container');
        if (!area) return;
        const title = area.querySelector('.book-title, .spread-main-title');
        if (!title || title.closest('.editorial-hero')) return;
        this.page(key);
        const scene = this.scenes[key] || this.scenes.study;
        const hero = document.createElement('header');
        hero.className = 'editorial-hero' + (compact ? ' editorial-hero-compact' : '');
        hero.dataset.scene = key;
        const copy = document.createElement('div'); copy.className = 'editorial-hero-copy';
        const kicker = document.createElement('p'); kicker.className = 'editorial-kicker'; kicker.textContent = scene[2];
        const previous = title.previousElementSibling;
        if (previous?.classList.contains('eyebrow')) { kicker.textContent = previous.textContent; previous.remove(); }
        const following = title.nextElementSibling;
        title.before(hero); copy.append(kicker, title);
        if (following?.matches('.book-subtitle, .spread-lede')) copy.append(following);
        else if (!compact) {
            const description = document.createElement('p'); description.className = 'editorial-description';
            description.textContent = text || scene[3]; copy.append(description);
        }
        const frame = document.createElement('figure'); frame.className = 'editorial-photo-frame';
        frame.append(this.photo(key, {compact})); hero.append(copy, frame);
    },
    tiles() {
        const keys = ['layouts','author','compare','book','train','compare','stats','deck'];
        document.querySelectorAll('.academy-tiles > button').forEach((button, i) => {
            if (button.querySelector('.editorial-tile-photo')) return;
            const frame = document.createElement('span'); frame.className = 'editorial-tile-photo';
            const img = this.photo(keys[i], {lazy:true}); img.alt = ''; frame.append(img); button.prepend(frame);
        });
    },
    schemes() {
        document.querySelectorAll('.layout-tile[data-layout]').forEach(button => {
            if (button.querySelector('.editorial-scheme')) return;
            const cfg = Spreads.types[button.dataset.layout]; if (!cfg) return;
            const frame = document.createElement('span'); frame.className = 'editorial-scheme';
            frame.setAttribute('aria-hidden', 'true'); frame.innerHTML = Home.icon(cfg); button.prepend(frame);
        });
    },
    authorThumbnails() {
        const rows = document.querySelectorAll('#authorResults .book-row');
        if (!rows.length) return;
        const items = Author.search(Author.tab, document.getElementById('authorSearch')?.value || '', document.getElementById('authorSuit')?.value || 'all');
        rows.forEach((row, i) => {
            const item = items[i]; if (!item) return;
            const codes = Author.tab === 'cards' ? [item.code] : Author.tab === 'pairs' ? item.cards : Author.tab === 'courts' ? item.roles.slice(0,2).map(r=>r.card) : Author.tab === 'cases' ? item.positions.slice(0,2).map(p=>p.card) : [];
            const cards = codes.map(code=>Author.card(code)).filter(Boolean);
            if (!cards.length && !['lessons','practices'].includes(Author.tab)) return;
            row.classList.add('editorial-illustrated-row');
            const frame = row.firstElementChild; frame.textContent = ''; frame.className = 'editorial-row-thumbs';
            if (cards.length) cards.forEach(card => {
                const img = document.createElement('img'); img.src = card.img; img.alt = ''; img.width = 42; img.height = 72; img.loading = 'lazy'; frame.append(img);
            });
            else { const img = this.photo(Author.tab === 'lessons' ? 'book' : 'mirror', {lazy:true}); img.alt = ''; frame.classList.add('editorial-row-scene'); frame.append(img); }
        });
    },
    journalThumbnails() {
        if (!window.DeckLoader?.loaded) return;
        document.querySelectorAll('#historyList .journal-row').forEach(row => {
            const match = row.querySelector('button[onclick]')?.getAttribute('onclick').match(/^Journal\.open\((\d+)\)$/);
            const item = match && State.history[Number(match[1])];
            const card = item?.cards?.[0] && Academy.card(item.cards[0].cardId);
            if (!card) return;
            const img = document.createElement('img'); img.className = 'editorial-journal-card';
            img.src = card.img; img.alt = ''; img.width = 44; img.height = 76; img.loading = 'lazy';
            if (item.cards[0].orientation === 'reversed') img.classList.add('is-reversed');
            row.prepend(img);
        });
    },
    journal() {
        UI.closeCard(); Book.track(); Book.current = null;
        App.setView('journal'); App.setLink(null); this.page('journal');
        document.getElementById('spread-container').innerHTML = '';
        const target = document.getElementById('history-sidebar');
        if (!target.querySelector('.editorial-journal-hero')) {
            const wrapper = document.createElement('div'); wrapper.className = 'editorial-journal-hero';
            wrapper.innerHTML = '<h2 class="spread-main-title">Мой дневник</h2>';
            target.prepend(wrapper); this.decorate('journal', {root:wrapper});
        }
        UI.renderHistory(); target.setAttribute('tabindex','-1'); target.focus({preventScroll:true});
        target.scrollIntoView({block:'start',behavior:'smooth'});
    },
    wrap(object, method, after) {
        const original = object[method];
        object[method] = function(...args) {
            const result = original.apply(this, args);
            after(args, result); return result;
        };
    },
    init() {
        this.wrap(App, 'setView', ([key]) => { document.body.dataset.page = key; });
        this.wrap(App, 'showHome', () => { document.body.dataset.page = 'home'; Daily.select('home'); });
        this.wrap(UI, 'renderSpread', args => this.decorate(args[2]?.count === 1 ? 'daily' : 'reading', {compact:true}));
        this.wrap(Academy, 'gallery', () => this.decorate('deck'));
        this.wrap(Academy, 'home', () => { this.decorate('study'); this.tiles(); });
        this.wrap(Academy, 'train', () => this.decorate('train', {compact:true}));
        this.wrap(Academy, 'compare', () => this.decorate('compare', {compact:true}));
        this.wrap(Academy, 'stats', () => this.decorate('stats'));
        this.wrap(Book, 'contents', () => { this.decorate('book'); Book.focus(); });
        this.wrap(Book, 'chapter', args => { this.decorate('book', {compact:true}); Book.focus(Number(args[1]) > 0 ? Number(args[1]) : undefined); });
        this.wrap(Book, 'practice', () => { this.decorate('mirror', {compact:true}); Book.focus(); });
        this.wrap(Author, 'render', args => { this.decorate('author', {compact:!!args[0]}); Book.focus(); });
        this.wrap(Author, 'filter', () => this.authorThumbnails());
        this.wrap(SpreadLibrary, 'catalog', () => this.decorate('layouts'));
        this.wrap(SpreadLibrary, 'detail', () => this.decorate('layouts', {compact:true}));
        this.wrap(SpreadLibrary, 'filter', () => this.schemes());
        this.wrap(Journal, 'showManual', () => this.decorate('manual', {compact:true}));
        this.wrap(UI, 'renderHistory', () => this.journalThumbnails());
        Daily.journal = () => this.journal();
    }
};
Editorial.init();
