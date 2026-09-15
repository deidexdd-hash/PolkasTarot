/* Resume existing work by stable IDs. No new reading is created by navigation. */
window.ContinuePractice = {
    bookStarted: false,
    valid(item) {
        return !!window.DeckLoader?.loaded && Journal.validate(item);
    },
    home() {
        let section = document.getElementById('continueWork');
        if (!section) {
            section = document.createElement('section');
            section.id = 'continueWork';
            section.className = 'continue-work home-only';
            section.setAttribute('aria-labelledby', 'continueTitle');
            document.querySelector('.home-hero').before(section);
        }
        const recent = State.history.filter(item => this.valid(item) && !item.bookPractice)
            .sort((a,b) => (Date.parse(b.updatedAt || b.createdAt) || 0) - (Date.parse(a.updatedAt || a.createdAt) || 0))[0];
        const lesson = Personal.state.last;
        section.hidden = !(recent || lesson || this.bookStarted);
        section.replaceChildren();
        if (section.hidden) return;
        section.innerHTML = '<p class="home-kicker">В своём темпе</p><h2 id="continueTitle">Продолжим?</h2><div class="continue-grid"></div>';
        const grid = section.querySelector('.continue-grid');
        const add = (kind, title, description, action) => {
            const button = Personal.button('', action);
            button.className = 'continue-card';
            for (const [tag,text] of [['small',kind],['strong',title],['span',description]]) {
                const node = document.createElement(tag); node.textContent = text; button.append(node);
            }
            grid.append(button);
        };
        if (recent) add('Мой расклад', recent.spreadName || 'Сохранённый расклад', 'Вернуться к картам и наблюдениям', () => this.openReading(recent.id));
        if (this.bookStarted) {
            const chapter = Book.position.chapter;
            const title = Book.data?.chapters.find(c => c.id === chapter)?.title || (chapter === 'prologue' ? 'Пролог' : 'Глава ' + chapter);
            add('Моя книга', title, 'Продолжить с сохранённого места', () => Book.open(Book.position.chapter, Book.position.block));
        }
        if (lesson) {
            const title = Author.data?.lessons.find(c => c.id === lesson)?.title || 'Мой путь по книге';
            add('Моё обучение', title, Personal.state.completed.includes(lesson) ? 'Урок пройден · выбрать следующий' : 'Продолжить урок', () => Personal.state.completed.includes(lesson) ? Personal.course() : Author.open('lessons', lesson));
        }
        const links = Personal.actions(section);
        links.append(Personal.button('Моя библиотека', () => Personal.hub()), Personal.button('Избранное', () => Personal.hub(true)));
    },
    openReading(id) {
        const index = State.history.findIndex(item => item.id === id && this.valid(item) && !item.bookPractice);
        if (index < 0) return false;
        Journal.open(index);
        return true;
    },
    async start(code) {
        const source = State.history.find(item => item.id === Journal.currentId && this.valid(item) && !item.bookPractice);
        const area = document.querySelector('.reading-editor');
        if (!source || !source.cards.some(c => c.cardId === code) || !area) return;
        try {
            await Author.load();
            // A pending fetch must not reopen a practice after the visitor navigated away.
            if (!area.isConnected || Journal.currentId !== source.id) return;
            const saved = State.history.find(item => item.bookPractice && item.sourceReadingId === source.id && item.cards?.[0]?.cardId === code && this.valid(item));
            if (saved) { Book.practice(saved.id); return; }
            const card = Author.card(code);
            if (!card) return;
            Book.current = null;
            Book.practice(null, {
                card: code, chapter: card.chapter,
                question: source.question || card.question,
                exercise: {steps:[card.practice], closing:''},
                sourceReadingId: source.id
            });
        } catch (_) {
            const status = area.querySelector('#readingSaveStatus');
            if (area.isConnected && status) status.textContent = 'Не удалось загрузить упражнение. Попробуй открыть практику ещё раз.';
        }
    },
    practice() {
        const id = Book.practiceSource;
        if (!id) return;
        const root = document.getElementById('bookContent');
        if (!root) return;
        const panel = document.createElement('aside');
        panel.className = 'continue-source';
        const source = State.history.find(item => item.id === id && this.valid(item) && !item.bookPractice);
        const text = document.createElement('p');
        text.textContent = source ? 'Эта практика связана с твоим раскладом. Карты и заметки остались в исходной записи.' : 'Исходного расклада нет в этом дневнике. Практику можно продолжить отдельно.';
        panel.append(text);
        if (source) panel.append(Personal.button('← Вернуться к исходному раскладу', () => this.openReading(id)));
        root.querySelector('.editorial-hero')?.after(panel);
    },
    related(item) {
        const root = document.querySelector('.reading-editor');
        if (!root) return;
        const practices = State.history.filter(p => p.bookPractice && p.sourceReadingId === item.id && this.valid(p));
        if (!practices.length) return;
        const section = document.createElement('section');
        section.className = 'continue-related';
        section.innerHTML = '<h3>Мои практики к этому раскладу</h3>';
        practices.forEach(p => {
            const card = Academy.card(p.cards[0].cardId);
            section.append(Personal.button('Продолжить · ' + (card?.name || 'Карта как зеркало'), () => Book.practice(p.id)));
        });
        root.append(section);
    },
    init() {
        try { this.bookStarted = localStorage.getItem('polkas-book-v1') !== null; } catch (_) {}
        const init = App.init.bind(App);
        App.init = async (...args) => { await init(...args); this.home(); };
        const showHome = App.showHome.bind(App);
        App.showHome = (...args) => { Book.track(); Book.current = null; showHome(...args); this.home(); };
        Editorial.wrap(Book, 'chapter', () => { this.bookStarted = true; });
        Editorial.wrap(Book, 'practice', () => this.practice());
        Editorial.wrap(Journal, 'showEditor', ([item]) => this.related(item));
        const menu = document.getElementById('homeMenu');
        const link = Personal.button('Моя библиотека и поиск ↗', () => { Home.closeMenu(); Personal.hub(); });
        menu.querySelector('p').before(link);
    }
};
ContinuePractice.init();
