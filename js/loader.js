// js/loader.js — загрузка колоды из data/cards.json.
//
// Раньше данные подключались пятью тегами <script>, каждый из которых
// дописывал window.TarotDB. Теперь единственное, что читает приложение, —
// выгрузка data/cards.json. Исходником остаются js/data/*.js: из них
// выгрузку собирает tools/js2json.js, а CI следит, чтобы они не разошлись.
//
// Загрузка асинхронная, поэтому TarotDB объявляется сразу пустым: и Deck,
// и UI обращаются к нему напрямую, и им нужен объект, а не undefined.

window.TarotDB = {
    major: [],
    minor: {
        wands: [],
        cups: [],
        swords: [],
        pentacles: []
    }
};

window.DeckLoader = {
    loaded: false,
    failed: null,   // текст последней ошибки, если загрузка не удалась

    /**
     * Раскладывает плоский список карт по мастям — в ту форму,
     * которую ожидают Deck.create() и галерея в UI.
     */
    fill(cards) {
        const db = window.TarotDB;
        db.major.length = 0;
        for (const suit of Object.keys(db.minor)) {
            db.minor[suit].length = 0;
        }

        for (const card of cards) {
            if (card.arcana === 'major') {
                db.major.push(card);
            } else if (db.minor[card.suit]) {
                db.minor[card.suit].push(card);
            } else {
                console.warn('Карта с неизвестной мастью пропущена:', card.name, card.suit);
            }
        }
        return db;
    },

    /**
     * Читает data/cards.json. Бросает исключение, если файл недоступен
     * или пуст, — вызывающий решает, что показать пользователю.
     */
    async load() {
        if (this.loaded) return window.TarotDB;

        try {
            const response = await fetch('data/cards.json');
            if (!response.ok) {
                throw new Error(`data/cards.json — HTTP ${response.status}`);
            }

            const data = await response.json();
            const cards = Array.isArray(data) ? data : data.cards;
            if (!Array.isArray(cards) || cards.length === 0) {
                throw new Error('data/cards.json не содержит карт');
            }

            this.fill(cards);
            this.loaded = true;
            this.failed = null;
            console.log(`Колода загружена из data/cards.json: ${cards.length} карт`);
            return window.TarotDB;
        } catch (error) {
            this.failed = error.message;
            throw error;
        }
    }
};
