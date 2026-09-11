// js/app.js - Главная логика приложения
window.App = {
    showHome() {
        document.body.classList.remove('reading-active');
        document.querySelectorAll('[data-spread]').forEach(el => el.removeAttribute('aria-current'));
        document.getElementById('spread-container').innerHTML = this.homeMarkup || '';
        this.setLink(null);
        window.scrollTo({top: 0, behavior: 'smooth'});
    },
    setView(key) {
        document.body.classList.add('reading-active');
        document.querySelectorAll('[data-spread]').forEach(el => {
            if (el.dataset.spread === key) el.setAttribute('aria-current', 'true');
            else el.removeAttribute('aria-current');
        });
    },
    /**
     * Показать всю колоду
     */
    showDeck() {
        if (!this.deckReady()) return;
        try {
            this.setView("deck");
            UI.renderDeckGallery();
            this.scrollToResults();
        } catch (error) {
            console.error('Ошибка при отображении колоды:', error);
            alert('Произошла ошибка при загрузке колоды. Попробуйте обновить страницу.');
        }
    },

    /**
     * Выполнить расклад
     */
    doSpread(spreadKey, options) {
        if (!this.deckReady()) return;
        if (spreadKey === 'daily' && !options && window.Daily) return Daily.open();
        try {
            const config = Spreads.types[spreadKey];
            if (!config) {
                console.error(`Расклад "${spreadKey}" не найден`);
                return;
            }

            const opts = options || {};
            const reversals = opts.reversals != null ? !!opts.reversals : (window.Academy?.state.settings.reversals !== false);
            if (opts.manualCards && !Journal.validManual(opts.manualCards, config.count)) {
                alert('Выберите разные карты для всех позиций.');
                return;
            }
            // Вопрос берём из поля, если его не передали явно (по ссылке).
            const field = document.getElementById('questionInput');
            const question = String(
                opts.question != null ? opts.question : (field ? field.value : '')
            ).trim().slice(0, 200);
            const day = opts.day || this.today();

            // Расклад по вопросу обязан повториться: тот же вопрос в тот же
            // день даёт те же карты, и ссылкой на него можно поделиться.
            // Без вопроса раздача остаётся случайной, из crypto.
            const rng = question
                ? Utils.seededRng(Utils.hashSeed(`${question.toLowerCase()}|${day}|${spreadKey}`))
                : null;

            // Создаем колоду
            const fullDeck = Deck.create(rng);
            if (!fullDeck || fullDeck.length === 0) {
                alert('Ошибка загрузки колоды. Проверьте консоль (F12).');
                return;
            }

            // Тянем карты
            const results = [];
            for (let i = 0; i < config.count; i++) {
                const cardData = opts.manualCards ? opts.manualCards[i] : Deck.draw(fullDeck, rng);
                if (!cardData) {
                    console.error('Ошибка при вытягивании карты');
                    continue;
                }

                const orientation = cardData.reversed && (opts.manualCards || reversals) ? 'reversed' : 'direct';

                // Толкования берутся из карты: data/cards.json содержит
                // полный текст для всех 78 карт в обоих положениях.
                const meanings = cardData.meanings && cardData.meanings[orientation]
                    ? cardData.meanings[orientation]
                    : {};

                results.push({
                    cardId: cardData.code,
                    name: cardData.name,
                    img: cardData.img,
                    orientation: orientation,
                    correspondences: cardData.correspondences || null,
                    label: config.labels[i] || `Позиция ${i + 1}`,
                    general: meanings.general || "Описание отсутствует",
                    love: meanings.love || "Информация отсутствует",
                    work: meanings.work || "Информация отсутствует",
                    finance: meanings.finance || "Информация отсутствует",
                    health: meanings.health || "Информация отсутствует",
                    time_frames: meanings.time_frames || null,
                    yes_no: meanings.yes_no || null,
                    advice: meanings.advice || "Следуйте интуиции",
                    spreadName: config.title,
                    spreadKey: spreadKey,
                    date: Utils.formatDate()
                });
            }

            const session = Journal.create(spreadKey, results, config, question, day,
                opts.manualCards ? 'manual' : 'virtual');
            if (opts.dailyPractice) session.dailyPractice = true;
            State.history.unshift(session);
            const saved = HistoryStore.save();

            // Отображаем результаты
            this.setView(spreadKey);
            UI.renderSpread(config.title, results, config, { question, day, spreadKey, manual: !!opts.manualCards });
            Journal.showEditor(session, saved);

            // Ссылка держится в hash: он не уходит на сервер, то есть вопрос
            // остаётся между человеком и тем, кому он сам дал ссылку.
            this.setLink(question && !opts.manualCards ? { question, day, spreadKey, reversals } : null);
            UI.renderHistory();
            
            // Скроллим к результатам
            this.scrollToResults();

        } catch (error) {
            console.error('Ошибка при выполнении расклада:', error);
            alert('Произошла ошибка. Попробуйте обновить страницу.');
        }
    },

    /** Сегодняшняя дата в виде 2026-09-10 — часть зерна расклада. */
    today() {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    },

    /** Записывает расклад в адресную строку (или убирает оттуда). */
    setLink(state) {
        const hash = state
            ? '#' + new URLSearchParams({
                s: state.spreadKey, d: state.day, q: state.question, r: state.reversals === false ? '0' : '1'
            }).toString()
            : '';

        // replaceState предпочтительнее: он не засоряет историю браузера, и
        // «назад» уводит со страницы, а не отматывает расклады по одному.
        try {
            if (typeof history !== 'undefined' && history.replaceState) {
                history.replaceState(null, '', hash || location.pathname + location.search);
                return;
            }
        } catch (e) {
            // На странице, открытой как файл, браузер запрещает replaceState.
            // Тогда ссылка важнее чистой истории.
        }

        try {
            location.hash = hash;
        } catch (e) {
            // Адресная строка — украшение, ради неё падать не стоит.
        }
    },

    /** Читает расклад из адресной строки. Возвращает null, если его там нет. */
    readLink() {
        const raw = String(location.hash || '').replace(/^#/, '');
        if (!raw) return null;
        const p = new URLSearchParams(raw);
        const spreadKey = p.get('s');
        if (!spreadKey || !Spreads.types[spreadKey]) return null;
        return {
            spreadKey,
            question: (p.get('q') || '').slice(0, 200),
            reversals: p.get('r') !== '0',
            day: /^\d{4}-\d{2}-\d{2}$/.test(p.get('d') || '') ? p.get('d') : this.today()
        };
    },

    /** Копирует ссылку на текущий расклад. */
    async shareSpread() {
        const url = location.href;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                UI.flashShare('Ссылка скопирована');
                return;
            }
        } catch (e) {
            // Буфер обмена может быть запрещён — тогда показываем ссылку.
        }
        UI.flashShare(url);
    },

    /**
     * Колода читается из data/cards.json асинхронно. Если по кнопке кликнули
     * раньше, чем она пришла, честнее сказать «ещё грузится», чем показывать
     * ошибку загрузки.
     */
    deckReady() {
        if (window.DeckLoader && DeckLoader.loaded) return true;
        alert(window.DeckLoader && DeckLoader.failed
            ? 'Колода не загрузилась: ' + DeckLoader.failed + '. Обновите страницу.'
            : 'Колода ещё загружается. Попробуйте через секунду.');
        return false;
    },

    /**
     * Очистить историю
     */
    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить всю историю сеансов?')) {
            State.history = [];
            HistoryStore.save();
            UI.renderHistory();
        }
    },

    /**
     * Скроллинг к результатам
     */
    scrollToResults() {
        setTimeout(() => {
            const spreadContainer = document.getElementById('spread-container');
            if (spreadContainer) {
                spreadContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 300);
    },

    /**
     * Инициализация приложения
     */
    async init() {
        this.homeMarkup = document.getElementById('spread-container').innerHTML;

        // История необязательна: что бы с ней ни случилось, колода должна
        // загрузиться. Поэтому её ошибки сюда не поднимаются.
        try {
            if (window.HistoryStore) HistoryStore.load();
            if (window.UI) UI.renderHistory();
        } catch (error) {
            console.warn('Не удалось восстановить историю:', error);
        }

        // Колода приходит из data/cards.json, то есть асинхронно:
        // до её загрузки расклады и галерея недоступны.
        try {
            await DeckLoader.load();
        } catch (error) {
            console.error('Не удалось загрузить колоду:', error);
            const container = document.getElementById('spread-container');
            if (container) {
                container.innerHTML =
                    '<p style="text-align: center; padding: 40px;">' +
                    'Не удалось загрузить data/cards.json. Проверьте консоль (F12).</p>';
            }
            return;
        }

        // Пришли по ссылке на расклад — сразу его и показываем.
        const link = this.readLink();
        if (link) {
            this.doSpread(link.spreadKey, { question: link.question, day: link.day, reversals: link.reversals });
            const field = document.getElementById('questionInput');
            if (field) field.value = link.question;
        }

        const testDeck = Deck.create();
        if (testDeck && testDeck.length === 78) {
            console.log('✅ Колода загружена корректно: 78 карт');
        } else {
            console.warn('⚠️ Проблема с загрузкой колоды. Карт:', testDeck ? testDeck.length : 0);
        }
    }
};

// Автоинициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
