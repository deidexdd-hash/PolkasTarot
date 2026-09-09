// js/ui.js - Управление интерфейсом
window.UI = {
    /**
     * Отрисовка расклада
     */
    renderSpread(title, cards, config) {
        const container = document.getElementById('spread-container');
        if (!container) return;

        const isDaily = config.count === 1;

        // Генерация HTML для карт
        const cardsHtml = cards.map((item, index) => {
            const imgPath = item.img || 'img/cards/card_back.jpg';
            const orientation = item.orientation || 'direct';
            const orientationText = orientation === 'reversed' ? 'Перевернутая' : 'Прямая';
            const orientationEmoji = orientation === 'reversed' ? '🔄' : '✨';

            return `
                <div class="card-item ${orientation}" style="grid-area: p${index + 1}">
                    <div class="pos-label">${item.label || `Позиция ${index + 1}`}</div>
                    <div class="card-flipper" onclick="this.classList.toggle('flipped')" title="Нажмите, чтобы перевернуть карту">
                        <div class="card-inner">
                            <div class="card-back"></div>
                            <div class="card-front">
                                <img src="${imgPath}" 
                                     alt="${item.name}" 
                                     class="card-img"
                                     loading="lazy"
                                     onerror="this.src='img/cards/card_back.jpg'; console.error('Изображение не найдено:', '${imgPath}');">
                            </div>
                        </div>
                    </div>
                    <div class="card-title-under">${orientationEmoji} ${item.name}</div>
                </div>
            `;
        }).join('');

        // Генерация HTML для интерпретаций
        const infoHtml = cards.map((item, index) => {
            const orientationText = item.orientation === 'reversed' ? 'Перевернутая' : 'Прямая';
            const orientationColor = item.orientation === 'reversed' ? '#ff6b9d' : '#00d2ff';

            return `
                <div class="info-block">
                    <h3>
                        <span>${index + 1}. ${item.name}</span>
                        <small style="color: ${orientationColor};">(${orientationText})</small>
                    </h3>
                    <div class="info-content-wrapper">
                        <div class="info-main-text">
                            <p><strong>📖 Общее значение:</strong><br>${item.general || "Описание отсутствует"}</p>
                            <div class="advice-box">
                                <strong>💡 Совет:</strong>
                                ${UI.hasValue(item.advice)
                                    ? UI.renderValue(item.advice)
                                    : '<p>Слушайте свою интуицию</p>'}
                            </div>
                        </div>
                        <div class="info-sub-details">
                            <p>
                                <strong>❤️ Любовь и отношения</strong>
                                ${item.love || "Информация отсутствует"}
                            </p>
                            <p>
                                <strong>💼 Работа и карьера</strong>
                                ${item.work || "Информация отсутствует"}
                            </p>
                            <p>
                                <strong>💰 Финансы</strong>
                                ${item.finance || "Информация отсутствует"}
                            </p>
                            ${item.health ? `
                            <p>
                                <strong>🏥 Здоровье</strong>
                                ${item.health}
                            </p>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Стили для расклада
        const tableClass = isDaily ? 'spread-table daily-layout' : 'spread-table';
        // Раскладку передаём переменными, а не inline-стилем: иначе CSS не может
        // сложить многоколоночный расклад в столбец на узком экране.
        const tableStyle = isDaily
            ? ''
            : `--spread-cols: ${config.grid}; --spread-areas: ${config.areas.join(' ')};`;

        container.innerHTML = `
            <h2 class="spread-main-title">${title}</h2>
            ${config.description ? `<p class="spread-lede">${config.description}</p>` : ''}
            <div class="${tableClass}" style="${tableStyle}">
                ${cardsHtml}
            </div>
            <div class="interpretation-area">
                <h2>Толкование</h2>
                ${infoHtml}
            </div>
        `;
    },

    /**
     * Отрисовка галереи всей колоды
     */
    renderDeckGallery() {
        const container = document.getElementById('spread-container');
        if (!container) return;

        const db = window.TarotDB;
        if (!db) {
            container.innerHTML = '<p style="text-align: center; padding: 40px;">Ошибка загрузки данных колоды</p>';
            return;
        }

        // Собираем все карты
        const allCards = [
            ...db.major,
            ...db.minor.wands,
            ...db.minor.cups,
            ...db.minor.swords,
            ...db.minor.pentacles
        ];

        // Создаем фильтры
        const filterHtml = `
            <div class="filter-tabs">
                <button class="filter-tab active" onclick="UI.filterDeck('all')">Все (${allCards.length})</button>
                <button class="filter-tab" onclick="UI.filterDeck('major')">Старшие арканы (${db.major.length})</button>
                <button class="filter-tab" onclick="UI.filterDeck('wands')">Жезлы (${db.minor.wands.length})</button>
                <button class="filter-tab" onclick="UI.filterDeck('cups')">Кубки (${db.minor.cups.length})</button>
                <button class="filter-tab" onclick="UI.filterDeck('swords')">Мечи (${db.minor.swords.length})</button>
                <button class="filter-tab" onclick="UI.filterDeck('pentacles')">Пентакли (${db.minor.pentacles.length})</button>
            </div>
        `;

        // Создаем секции
        const sectionsHtml = `
            <div class="deck-section" data-type="all">
                <h3 class="deck-section-title">
                    Вся колода
                    <span class="count">${allCards.length} карт</span>
                </h3>
                ${this.renderCardGrid(allCards)}
            </div>
            
            <div class="deck-section" data-type="major" style="display: none;">
                <h3 class="deck-section-title">
                    🌟 Старшие арканы
                    <span class="count">${db.major.length} карт</span>
                </h3>
                ${this.renderCardGrid(db.major)}
            </div>
            
            <div class="deck-section" data-type="wands" style="display: none;">
                <h3 class="deck-section-title">
                    🔥 Жезлы
                    <span class="count">${db.minor.wands.length} карт</span>
                </h3>
                ${this.renderCardGrid(db.minor.wands)}
            </div>
            
            <div class="deck-section" data-type="cups" style="display: none;">
                <h3 class="deck-section-title">
                    💧 Кубки
                    <span class="count">${db.minor.cups.length} карт</span>
                </h3>
                ${this.renderCardGrid(db.minor.cups)}
            </div>
            
            <div class="deck-section" data-type="swords" style="display: none;">
                <h3 class="deck-section-title">
                    ⚔️ Мечи
                    <span class="count">${db.minor.swords.length} карт</span>
                </h3>
                ${this.renderCardGrid(db.minor.swords)}
            </div>
            
            <div class="deck-section" data-type="pentacles" style="display: none;">
                <h3 class="deck-section-title">
                    🪙 Пентакли
                    <span class="count">${db.minor.pentacles.length} карт</span>
                </h3>
                ${this.renderCardGrid(db.minor.pentacles)}
            </div>
        `;

        container.innerHTML = `
            <div class="deck-gallery">
                <h2 class="spread-main-title">Колода</h2>
                <p class="spread-lede">78 карт Райдера-Уэйта с подробными толкованиями</p>
                ${filterHtml}
                ${sectionsHtml}
            </div>
        `;
    },

    /**
     * Создание сетки карт
     */
    renderCardGrid(cards) {
        return `
            <div class="deck-grid">
                ${cards.map(card => `
                    <div class="deck-card" onclick="UI.showCardDetail('${card.name.replace(/'/g, "\\'")}')">
                        <div class="deck-card-image">
                            <img src="${card.img}" alt="${card.name}" loading="lazy">
                        </div>
                        <div class="deck-card-name">${card.name}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Фильтрация колоды
     */
    filterDeck(type) {
        // Обновляем активную кнопку
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');

        // Показываем нужную секцию
        document.querySelectorAll('.deck-section').forEach(section => {
            if (section.dataset.type === type) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });

        // Скроллим к началу
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Показать детальную информацию о карте
     */
    showCardDetail(cardName) {
        const db = window.TarotDB;
        if (!db) return;

        // Находим карту
        const allCards = [
            ...db.major,
            ...db.minor.wands,
            ...db.minor.cups,
            ...db.minor.swords,
            ...db.minor.pentacles
        ];

        const card = allCards.find(c => c.name === cardName);
        if (!card) return;

        // Определяем тип карты
        let cardType = '';
        if (db.major.includes(card)) cardType = 'Старший аркан';
        else if (db.minor.wands.includes(card)) cardType = 'Масть Жезлов';
        else if (db.minor.cups.includes(card)) cardType = 'Масть Кубков';
        else if (db.minor.swords.includes(card)) cardType = 'Масть Мечей';
        else if (db.minor.pentacles.includes(card)) cardType = 'Масть Пентаклей';

        // Толкования берутся из самой карты: data/cards.json содержит
        // полный текст для всех 78 карт в обоих положениях.
        const directMeanings = card.meanings.direct;
        const reversedMeanings = card.meanings.reversed;

        // У старших арканов yes_no один на карту и совпадает в обоих
        // положениях — выводим его отдельно, чтобы не показывать дважды.
        // У младших ответы разные, там он остаётся внутри положения.
        const sharedYesNo = directMeanings.yes_no &&
            directMeanings.yes_no === reversedMeanings.yes_no
            ? directMeanings.yes_no
            : null;
        const skip = sharedYesNo ? ['yes_no'] : [];

        // Создаем HTML для модального окна
        const modalHtml = `
            <div class="modal-card-detail">
                <div class="modal-card-header">
                    <div class="modal-card-image">
                        <img src="${card.img}" alt="${card.name}">
                    </div>
                    <div class="modal-card-info">
                        <h2>${card.name}</h2>
                        <span class="card-type">${cardType}</span>
                    </div>
                </div>
                
                <div class="modal-meanings">
                    <div class="meaning-section">
                        <h3>
                            Прямое положение
                            <span class="orientation-badge direct">Прямая</span>
                        </h3>
                        ${this.renderMeaningItems(directMeanings, skip)}
                    </div>

                    <div class="meaning-section">
                        <h3>
                            Перевёрнутое положение
                            <span class="orientation-badge reversed">Перевёрнутая</span>
                        </h3>
                        ${this.renderMeaningItems(reversedMeanings, skip)}
                    </div>

                    ${sharedYesNo ? `
                    <div class="meaning-section">
                        <h3>Ответ да/нет</h3>
                        <div class="meaning-item">
                            <p>${sharedYesNo}</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        const modal = document.getElementById('cardModal');
        const modalBody = document.getElementById('modalBody');
        if (modal && modalBody) {
            modalBody.innerHTML = modalHtml;
            modalBody.scrollTop = 0;
            modal.classList.add('active');
            // Пока лист открыт, фон под ним прокручиваться не должен.
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Закрыть карточку карты.
     */
    closeCard() {
        const modal = document.getElementById('cardModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    /**
     * В data/cards.json advice и combinations — списки. Раньше у старших
     * арканов advice тоже был массивом, и шаблон выводил его как
     * «совет1,совет2,совет3»; теперь список рендерится списком.
     */
    renderValue(value) {
        if (Array.isArray(value)) {
            return '<ul class="meaning-list">' +
                value.map((item) => `<li>${item}</li>`).join('') +
                '</ul>';
        }
        return `<p>${value}</p>`;
    },

    /**
     * Пустой массив в JavaScript истинный, поэтому одной проверки
     * на истинность для полей-списков мало.
     */
    hasValue(value) {
        return Array.isArray(value) ? value.length > 0 : Boolean(value);
    },

    /**
     * Рендер элементов значений карты
     */
    // Порядок и подписи полей карточки. Часть из них заполнена только
    // у старших арканов — то, чего у карты нет, просто не выводится.
    MEANING_FIELDS: [
        { key: 'symbolism',     label: '🖼️ Символика' },
        { key: 'general',       label: '📖 Общее значение' },
        { key: 'love',          label: '❤️ Любовь и отношения' },
        { key: 'relations',     label: '👥 Отношения с окружающими' },
        { key: 'work',          label: '💼 Работа и карьера' },
        { key: 'finance',       label: '💰 Финансы' },
        { key: 'health',        label: '🏥 Здоровье' },
        { key: 'psychological', label: '🧠 Психологический аспект' },
        { key: 'spiritual',     label: '🕊️ Духовный аспект' },
        { key: 'time_frames',   label: '⏳ Сроки' },
        { key: 'combinations',  label: '🔗 Сочетания с другими картами' },
        { key: 'advice',        label: '💡 Совет' },
        { key: 'yes_no',        label: '🔮 Ответ да/нет' }
    ],

    renderMeaningItems(meanings, skip) {
        if (!meanings) return '<p>Информация отсутствует</p>';
        const skipped = skip || [];

        const items = this.MEANING_FIELDS
            .filter((field) => !skipped.includes(field.key))
            .filter((field) => this.hasValue(meanings[field.key]))
            .map((field) => `
                <div class="meaning-item">
                    <strong>${field.label}</strong>
                    ${this.renderValue(meanings[field.key])}
                </div>
            `);

        return items.length ? items.join('') : '<p>Информация отсутствует</p>';
    },

    /**
     * Отрисовка истории
     */
    renderHistory() {
        const list = document.getElementById('historyList');
        if (!list) return;

        if (!State.history || State.history.length === 0) {
            list.innerHTML = '<li class="empty-msg">История пока пуста</li>';
            return;
        }

        const historyHtml = State.history.slice(0, 10).map((item, index) => {
            const date = item.date || 'Неизвестная дата';
            const time = date.split(',')[1] ? date.split(',')[1].trim() : '';
            const spreadName = item.spreadName || 'Неизвестный расклад';
            const cardName = item.name || 'Карта';
            const cardsCount = item.cardsCount ? ` (${item.cardsCount} карт)` : '';

            return `
                <li>
                    <span class="row-body">
                        <span class="row-title">${cardName}</span>
                        <span class="row-note">${spreadName}${cardsCount}</span>
                    </span>
                    <small>${time}</small>
                </li>
            `;
        }).join('');

        list.innerHTML = historyHtml;
    },

    /**
     * Показать уведомление
     */
    showNotification(message, type = 'info') {
        // Можно добавить toast-уведомления
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};
