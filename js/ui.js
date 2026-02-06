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
                                <strong>💡 Совет:</strong><br>
                                ${item.advice || "Слушайте свою интуицию"}
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
        const tableStyle = isDaily 
            ? '' 
            : `display: grid; grid-template-columns: ${config.grid}; grid-template-areas: ${config.areas.join(' ')}; gap: 40px; justify-items: center;`;

        // Итоговый HTML
        container.innerHTML = `
            <h2 class="spread-main-title">✨ ${title} ✨</h2>
            ${config.description ? `<p style="text-align: center; color: #b8b8b8; margin-bottom: 30px; font-size: 1.1rem;">${config.description}</p>` : ''}
            <div class="${tableClass}" style="${tableStyle}">
                ${cardsHtml}
            </div>
            <div class="interpretation-area">
                <h2>📜 Толкование расклада</h2>
                ${infoHtml}
            </div>
        `;
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
                    <div>
                        <small style="display: block; margin-bottom: 5px;">${time}</small>
                        <b>${cardName}</b>
                        <small style="display: block; color: #888; margin-top: 3px;">
                            ${spreadName}${cardsCount}
                        </small>
                    </div>
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
