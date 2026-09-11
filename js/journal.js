// Local reading snapshots. User-authored text is escaped only at the render boundary.
window.Journal = {
    currentId: null,
    cards() { return [...TarotDB.major, ...Object.values(TarotDB.minor).flat()]; },
    uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Utils.randomInt(1000000000)}`; },
    create(spreadKey, cards, config, question, day, source) {
        return JSON.parse(JSON.stringify({schemaVersion: 2, id: this.uid(), createdAt: new Date().toISOString(),
            day, date: Utils.formatDate(), spreadKey, spreadName: config.title, config, question,
            cards, cardsCount: cards.length, name: cards[0].name, source, notes: '', tags: '', favorite: false}));
    },
    validManual(cards, count) {
        const known = new Set(this.cards().map(c => c.code));
        return Array.isArray(cards) && cards.length === count && cards.every(c => c && known.has(c.code)) &&
            new Set(cards.map(c => c.code)).size === count;
    },
    safe(value) {
        if (typeof value === 'string') return UI.escape(value);
        if (Array.isArray(value)) return value.map(x => this.safe(x));
        if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,this.safe(v)]));
        return value;
    },
    open(index) {
        const item = State.history[index];
        if (!item || item.schemaVersion !== 2) return;
        if (!this.validate(item)) { this.status('Эта запись повреждена и не может быть открыта.'); return; }
        App.setView(item.spreadKey);
        App.setLink(null);
        document.getElementById('questionInput').value = item.question || '';
        const config = {...item.config, title:UI.escape(item.config.title), description:UI.escape(item.config.description || '')};
        UI.renderSpread(UI.escape(item.spreadName), this.safe(item.cards), config, {});
        this.showEditor(item, null);
        App.scrollToResults();
    },
    showEditor(item, saved) {
        this.currentId = item.id;
        const editor = document.createElement('section');
        editor.className = 'reading-editor';
        editor.innerHTML = `<div class="section-head"><h2>Мои наблюдения</h2><span>${item.source === 'manual' ? 'Своя колода' : 'Виртуальная колода'}</span></div>
            <p class="session-question">${UI.escape(item.question || 'Расклад без вопроса')}</p>
            <label for="readingNotes">Что я замечаю? Что чувствую? Какой следующий шаг выбираю?</label>
            <textarea id="readingNotes" rows="4" maxlength="10000" placeholder="Ваши мысли останутся в дневнике на этом устройстве" oninput="Journal.draft()">${UI.escape(item.notes || '')}</textarea>
            <label for="readingTags">Теги через запятую</label><input id="readingTags" maxlength="200" placeholder="отношения, работа, личное" value="${UI.escape(item.tags || '')}" oninput="Journal.draft()">
            <div class="editor-actions"><button class="primary-button" onclick="Journal.saveNotes()">Сохранить заметку</button><label><input id="readingFavorite" type="checkbox" ${item.favorite ? 'checked' : ''} onchange="Journal.draft()"> Избранное</label></div>
            <p id="readingSaveStatus" role="status" aria-live="polite">${saved === false ? 'Не сохранено на устройстве. Сделайте экспорт дневника.' : saved === true ? 'Расклад сохранён на этом устройстве.' : 'Сохранённый расклад · ' + UI.escape(item.date || '')}</p>`;
        document.getElementById('spread-container').appendChild(editor);
    },
    draft() {
        const item = State.history.find(x => x.id === this.currentId);
        if (!item) return;
        item.notes = document.getElementById('readingNotes').value;
        item.tags = document.getElementById('readingTags').value;
        item.favorite = document.getElementById('readingFavorite').checked;
        item.updatedAt = new Date().toISOString();
        const saved = HistoryStore.save();
        document.getElementById('readingSaveStatus').textContent = saved ? 'Изменения сохранены на устройстве.' : 'Не сохранено на устройстве. Сделайте экспорт дневника.';
        UI.renderHistory();
    },
    saveNotes() { this.draft(); },
    status(message) { document.getElementById('journalStatus').textContent = message; },
    exportData() {
        const blob = new Blob([JSON.stringify({schemaVersion:2, readings:State.history},null,2)],{type:'application/json'});
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = `polkas-diary-${App.today()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.status('Экспорт подготовлен. Файл содержит ваши вопросы и заметки.');
    },
    validate(item) {
        if (!item || item.schemaVersion !== 2 || typeof item.id !== 'string' || item.id.length > 100 || !Spreads.types[item.spreadKey]) return false;
        if (!Array.isArray(item.cards) || item.cards.length < 1 || item.cards.length > 12) return false;
        const cfg = item.config;
        if (!cfg || cfg.count !== item.cards.length || typeof cfg.grid !== 'string' || !/^repeat\(([1-9]|1[0-2]), 1fr\)$/.test(cfg.grid) || !Array.isArray(cfg.areas) || cfg.areas.length > 12 || !cfg.areas.every(a => typeof a === 'string' && /^["'p\d.\s]+$/.test(a))) return false;
        if (typeof cfg.title !== 'string' || (cfg.description != null && typeof cfg.description !== 'string')) return false;
        const known = new Map(this.cards().map(c => [c.code,c]));
        if (new Set(item.cards.map(c => c?.cardId)).size !== item.cards.length) return false;
        if (!item.cards.every(c => c && known.has(c.cardId) && c.img === known.get(c.cardId).img && ['direct','reversed'].includes(c.orientation) && typeof c.name === 'string')) return false;
        return ['notes','tags','question','spreadName','date','day','firstLook','followUp'].every(k => item[k] == null || (typeof item[k] === 'string' && item[k].length <= 10000));
    },
    async importData(input) {
        const file = input.files[0];
        if (!file) return;
        try {
            if (!App.deckReady()) return;
            if (file.size > 8 * 1024 * 1024) throw new Error('Файл больше 8 МБ');
            const data = JSON.parse(await file.text());
            if (data.schemaVersion !== 2 || !Array.isArray(data.readings) || data.readings.length > 2000) throw new Error('Неверный формат файла');
            const clean = data.readings.map(item => {
                if (item?.schemaVersion === 2) {
                    if (!this.validate(item)) throw new Error('В файле есть некорректный расклад');
                    // Reject arbitrary nested markup/CSS before it can reach existing renderers.
                    if (JSON.stringify(item).length > 150000) throw new Error('Слишком большая запись');
                    return item;
                }
                if (!item || typeof item.name !== 'string' || typeof item.spreadName !== 'string') throw new Error('Неверная старая запись');
                return {name:item.name, spreadName:item.spreadName, date:String(item.date || ''), question:String(item.question || '')};
            });
            const ids = new Set(State.history.filter(x=>x.id).map(x=>x.id));
            const legacyKey = x => JSON.stringify([x.name || '',x.spreadName || '',x.date || '',x.question || '']);
            const old = new Set(State.history.filter(x=>!x.id).map(legacyKey));
            const additions = clean.filter(x => { if(x.id){if(ids.has(x.id))return false;ids.add(x.id);return true;} const k=legacyKey(x);if(old.has(k))return false;old.add(k);return true; });
            const next = [...additions, ...State.history];
            const previous = State.history;
            State.history = next;
            if (!HistoryStore.save()) { State.history = previous; throw new Error('Не удалось сохранить импорт. Ваш дневник не изменён'); }
            UI.renderHistory(); this.status(`Добавлено записей: ${additions.length}. Существующие записи не заменялись.`);
        } catch (e) { this.status('Импорт не выполнен: ' + e.message); }
        finally { input.value = ''; }
    },
    showManual() {
        if (!App.deckReady()) return;
        App.setView('manual'); App.setLink(null);
        const options = Object.entries(Spreads.types).map(([k,c])=>`<option value="${k}">${UI.escape(c.title)}</option>`).join('');
        document.getElementById('spread-container').innerHTML = `<section class="manual-form"><h2 class="spread-main-title">Ваша колода</h2><p>Разложите карты перед собой и укажите, какие выпали в каждой позиции.</p><label for="manualSpread">Расклад</label><select id="manualSpread" onchange="Journal.manualFields()">${options}</select><div id="manualPositions"></div><button class="primary-button" onclick="Journal.submitManual()">Открыть толкование</button><p id="manualError" role="alert"></p></section>`;
        this.manualFields(); App.scrollToResults();
    },
    manualFields() {
        const key = document.getElementById('manualSpread').value, cfg = Spreads.types[key];
        const options = '<option value="">Выберите карту</option>' + this.cards().map(c=>`<option value="${UI.escape(c.code)}">${UI.escape(c.name)}</option>`).join('');
        document.getElementById('manualPositions').innerHTML = cfg.labels.map((label,i)=>`<fieldset><legend>${i+1}. ${UI.escape(label)}</legend><select id="manualCard${i}" aria-label="${UI.escape(label)}">${options}</select><label><input id="manualReverse${i}" type="checkbox"> Перевёрнутая</label></fieldset>`).join('');
    },
    submitManual() {
        const key = document.getElementById('manualSpread').value, cfg = Spreads.types[key];
        const cards = cfg.labels.map((_,i)=> {const c=this.cards().find(c=>c.code===document.getElementById(`manualCard${i}`).value);return c ? {...c,reversed:document.getElementById(`manualReverse${i}`).checked} : null;});
        if (!this.validManual(cards,cfg.count)) {document.getElementById('manualError').textContent='Выберите карту в каждой позиции. Карты не должны повторяться.'; return;}
        App.doSpread(key,{manualCards:cards});
    }
};
UI.renderHistory = function() {
    const list = document.getElementById('historyList'); if (!list) return;
    const query = (document.getElementById('journalSearch')?.value || '').toLocaleLowerCase();
    const favorite = document.getElementById('favoritesOnly')?.checked;
    const items = State.history.map((item,index)=>({item,index})).filter(({item})=>(!favorite || item.favorite) &&
        [item.question,item.notes,item.firstLook,item.followUp,item.tags,item.spreadName,item.name,...(Array.isArray(item.cards)?item.cards.map(c=>c.name):[])].join(' ').toLocaleLowerCase().includes(query));
    list.innerHTML = items.length ? items.map(({item,index})=>`<li class="journal-row"><div class="row-body"><span class="row-title">${item.favorite ? '★ ' : ''}${this.escape(item.spreadName || 'Расклад')}</span><span class="row-note">${this.escape(item.question || item.name || '')}</span><small>${this.escape(item.date || '')}${item.tags ? ' · '+this.escape(item.tags) : ''}</small>${item.schemaVersion !== 2 ? '<small>Старая запись — полный расклад не сохранялся</small>' : ''}</div>${item.schemaVersion === 2 ? `<button class="text-btn" onclick="Journal.open(${index})">Открыть</button>` : ''}</li>`).join('') : '<li class="empty-msg">'+(query || favorite ? 'Записей не найдено' : 'Здесь появятся ваши расклады')+'</li>';
};
