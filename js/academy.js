/* Study, comparison and personal practice. No remote requests or AI calls. */
window.Academy = {
    state: {settings:{reversals:true,firstLook:false}, notes:{}, progress:{}},
    filter:'all', currentCode:null, trainingCode:null, answerShown:false,
    e(value) { return UI.escape(value == null ? '' : value); },
    all() { return Journal.cards(); },
    card(code) { return this.all().find(c=>c.code===code); },
    read() {
        try {
            const raw = JSON.parse(localStorage.getItem('tarot-academy-v1') || 'null');
            if (raw) this.state = this.normalize(raw);
        } catch (_) { this.notice('Не удалось прочитать настройки обучения.'); }
    },
    normalize(raw) {
        const result={settings:{reversals:raw?.settings?.reversals !== false,firstLook:raw?.settings?.firstLook === true},notes:{},progress:{}};
        if (!raw || typeof raw !== 'object') return result;
        for(const [code,value] of Object.entries(raw.notes || {})) {
            if (/^(major_arcana\.\d{2}|minor_arcana\.(?:wands|cups|swords|pentacles)\.(?:ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king))$/.test(code) && typeof value==='string') result.notes[code]=value.slice(0,10000);
        }
        for(const [code,p] of Object.entries(raw.progress || {})) {
            if (!Object.hasOwn(TarotKnowledge,code) || !p || typeof p!=='object') continue;
            result.progress[code]={level:Math.min(4,Math.max(0,Number.isInteger(p.level)?p.level:0)),due:Number.isFinite(p.due)?Math.max(0,p.due):0,seen:Number.isInteger(p.seen)?Math.max(0,p.seen):0};
        }
        return result;
    },
    save() {
        try { localStorage.setItem('tarot-academy-v1',JSON.stringify(this.state)); return true; }
        catch (_) { this.notice('Изменения только в этой вкладке. Сделайте резервную копию обучения.'); return false; }
    },
    notice(text) { const el=document.getElementById('academyStatus');if(el)el.textContent=text; },
    setSetting(key,value) {
        if(!['reversals','firstLook'].includes(key))return;
        this.state.settings[key]=!!value;
        this.notice(this.save()?'Настройка сохранена. Она применяется к новым раскладам.':'Настройка не сохранена на устройстве.');
    },
    summary(c) { return TarotKnowledge[c.code]?.summary || (String(c.meanings.direct.general || '').match(/[^.!?]+[.!?]?/g)||[]).slice(0,2).join(' ').trim(); },
    keys(c) { return TarotKnowledge[c.code]?.keywords || [({wands:'действие',cups:'чувства',swords:'мысли',pentacles:'ресурсы'})[c.suit] || 'опыт',c.name]; },
    enter(title) {
        if(!App.deckReady())return false;
        UI.closeCard(); App.setView('academy'); App.setLink(null);
        document.getElementById('spread-container').innerHTML=`<section class="academy"><p class="eyebrow">POLKAS · ИЗУЧЕНИЕ И ПРАКТИКА</p><h2 class="spread-main-title">${this.e(title)}</h2><div id="academyContent"></div></section>`;
        App.scrollToResults(); return true;
    },
    home() {
        if(!this.enter('Ближе к картам'))return;
        const seen=Object.keys(this.state.progress).length;
        document.getElementById('academyContent').innerHTML=`<p>Исследуйте символы, сравнивайте значения и сохраняйте свой взгляд.</p><div class="academy-tiles">
        <button onclick="Academy.train()"><strong>Тренажёр</strong><span>22 старших аркана · изучено ${seen}</span></button>
        <button onclick="Academy.compare()"><strong>Две карты</strong><span>Сходства, различия и контекст</span></button>
        <button onclick="Academy.stats()"><strong>Мой дневник в цифрах</strong><span>Карты и масти за выбранный период</span></button>
        <button onclick="App.showDeck()"><strong>Атлас карт</strong><span>Поиск, символы, личные ассоциации</span></button></div>
        <h3>Короткие уроки</h3>${this.lessons().map(([title,body])=>`<details class="lesson"><summary>${this.e(title)}</summary><p>${this.e(body)}</p></details>`).join('')}
        <p class="source-note">Учебные тексты Polkas Tarot. Ориентиры: <a href="https://www.learntarot.com/course.htm" target="_blank" rel="noopener noreferrer">курс Joan Bunning</a> и <a href="https://sacred-texts.com/tarot/pkt/index.htm" target="_blank" rel="noopener noreferrer">Уэйт</a>. Значения относятся к традиции Райдера — Уэйта — Смит.</p>`;
    },
    lessons() { return [
        ['Как задать вопрос','Начните с того, что зависит от вас: «Что мне стоит учесть?», «Какой ресурс поможет?». Запишите факты отдельно от предположений. Один ясный вопрос удобнее нескольких несвязанных.'],
        ['Как читать одну карту','Сначала назовите видимые детали: жест, предмет, направление взгляда. Затем запишите личную ассоциацию. Только после этого сравните её со значением карты и позицией расклада.'],
        ['Масти как четыре ракурса','В распространённом современном прочтении Жезлы помогают говорить о действии, Кубки — о чувствах, Мечи — о мыслях и решениях, Пентакли — о материальной стороне. Это ориентиры, а не жёсткое деление жизни.'],
        ['Придворные карты','Паж, Рыцарь, Королева и Король могут описывать способы действовать и роли, а не обязательно конкретных людей. Исследуйте обучение, движение, заботу о процессе и ответственность; не привязывайте роль к полу человека.'],
        ['Позиция меняет вопрос','Одна карта в позиции «Ресурс» и в позиции «Препятствие» рассматривается с разных сторон. Спросите: как эта тема помогает, а как мешает в данной ситуации?'],
        ['Как соединить две карты','Сравните темы и изображения. Что повторяется? Где возникает контраст? Запишите две возможные связи и проверьте их на контексте вопроса. У пары нет единственного универсального ответа.'],
        ['Перевёрнутая карта','Это не обязательный «плохой знак». Можно исследовать задержку, внутренний процесс или чрезмерное проявление темы. Выберите согласованный способ чтения; перевёрнутые карты можно отключить.'],
        ['Завершение практики','Сформулируйте одну мысль и одно доступное действие. Позже вернитесь к записи: что изменилось, что вы поняли иначе? Карта — символический материал для размышления, а не доказательство будущего.']
    ]; },
    gallery() {
        if(!App.deckReady())return;
        this.filter='all';
        document.getElementById('spread-container').innerHTML=`<section class="deck-gallery"><h2 class="spread-main-title">Атлас 78 карт</h2><label for="cardSearch">Название, тема или символ</label><input class="academy-input" id="cardSearch" type="search" placeholder="Например: границы, фонарь, Луна" oninput="Academy.filterCards()"><div class="filter-tabs">${[['all','Все (78)'],['major','Старшие арканы (22)'],['wands','Жезлы'],['cups','Кубки'],['swords','Мечи'],['pentacles','Пентакли']].map(([key,label])=>`<button class="filter-tab ${key==='all'?'active':''}" data-filter="${key}" aria-pressed="${key==='all'}" onclick="Academy.filterCards('${key}')">${label}</button>`).join('')}</div><p id="cardCount" role="status"></p><div id="cardResults"></div></section>`;
        this.filterCards();
    },
    searchCards(query,filter) {
        const q=String(query).toLocaleLowerCase('ru').trim();
        return this.all().filter(c=>(filter==='all'||c.arcana===filter||c.suit===filter) &&
            [c.name,this.summary(c),...this.keys(c),...(TarotKnowledge[c.code]?.symbols || []).map(s=>s.name+' '+s.text),this.state.notes[c.code]||''].join(' ').toLocaleLowerCase('ru').includes(q));
    },
    filterCards(filter) {
        if(filter)this.filter=filter;
        const cards=this.searchCards(document.getElementById('cardSearch')?.value||'',this.filter);
        document.getElementById('cardCount').textContent=`Найдено: ${cards.length}`;
        document.getElementById('cardResults').innerHTML=cards.length?this.grid(cards):'<p>Попробуйте другое слово или выберите все масти.</p>';
        document.querySelectorAll('[data-filter]').forEach(b=>{const active=b.dataset.filter===this.filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    },
    grid(cards) { return `<div class="deck-grid">${cards.map(c=>`<button class="deck-card atlas-card" onclick="Academy.detail('${c.code}')"><span class="deck-card-image"><img src="${this.e(c.img)}" alt="${this.e(c.name)}" loading="lazy"></span><span class="deck-card-name">${this.e(c.name)}</span></button>`).join('')}</div>`; },
    detail(code) {const c=this.card(code);if(c)UI.showCardDetail(c.name);},
    enrich(c) {
        this.currentCode=c.code;
        const k=TarotKnowledge[c.code], body=document.getElementById('modalBody'), meanings=body.querySelector('.modal-meanings');
        if(!meanings)return;
        meanings.id='fullCardMeanings'; meanings.hidden=true;
        // Replace old unverified symbolism in the visible expanded meanings.
        const panel=document.createElement('section');panel.className='card-study';
        panel.innerHTML=`<div class="keyword-row">${this.keys(c).map(k=>`<span>${this.e(k)}</span>`).join('')}</div><p class="card-brief">${this.e(this.summary(c))}</p>
        <button class="text-btn" aria-expanded="false" aria-controls="fullCardMeanings" onclick="Academy.toggleMeanings(this)">Подробнее: все значения</button>
        ${k?`<h3>Детали изображения</h3><div class="symbol-list">${k.symbols.map(s=>`<details><summary>${this.e(s.name)}</summary><p>${this.e(s.text)}</p></details>`).join('')}</div><p>${this.e(k.prompt)}</p><p class="source-note">${this.e(k.editorial)} <a href="${k.source}" target="_blank" rel="noopener noreferrer">${this.e(k.sourceLabel)}</a></p>`:''}
        <label for="personalCardNote">Мои ассоциации с картой</label><textarea id="personalCardNote" class="academy-input" rows="3" maxlength="10000" placeholder="Образ, чувство, случай из жизни" oninput="Academy.saveCardNote()">${this.e(this.state.notes[c.code]||'')}</textarea><p id="cardNoteStatus" role="status"></p>`;
        body.insertBefore(panel,meanings.parentElement===body?meanings:body.firstChild);
        // Put study material after the visual header inside the detail container.
        const header=body.querySelector('.modal-card-header');if(header)header.after(panel);
    },
    toggleMeanings(button) {const el=document.getElementById('fullCardMeanings');el.hidden=!el.hidden;button.setAttribute('aria-expanded',String(!el.hidden));button.textContent=el.hidden?'Подробнее: все значения':'Свернуть подробные значения';},
    saveCardNote() {
        if(!this.card(this.currentCode))return;
        this.state.notes[this.currentCode]=document.getElementById('personalCardNote').value.slice(0,10000);
        document.getElementById('cardNoteStatus').textContent=this.save()?'Ассоциация сохранена на устройстве.':'Не сохранено. Сделайте резервную копию обучения.';
    },
    nextTraining(now=Date.now()) {
        const cards=this.all().filter(c=>Object.hasOwn(TarotKnowledge,c.code));
        const candidates=cards.filter(c=>c.code!==this.trainingCode);
        candidates.sort((a,b)=>{
            const pa=this.state.progress[a.code]||{due:0,seen:0},pb=this.state.progress[b.code]||{due:0,seen:0};
            return Number(pa.due>now)-Number(pb.due>now)||pa.due-pb.due||pa.seen-pb.seen;
        });return candidates[0]||cards[0];
    },
    train() {
        if(!this.enter('Практика чтения'))return;
        const c=this.nextTraining();if(!c)return;
        this.trainingCode=c.code;this.answerShown=false;
        const learned=Object.keys(this.state.progress).length;
        document.getElementById('academyContent').innerHTML=`<p>Рассмотрите карту, запишите свою версию и сравните с подсказкой. Самооценка помогает выбрать следующее повторение.</p><p>Карты с отметкой: ${learned} из 22</p><div class="training-layout"><img class="training-card" src="${this.e(c.img)}" alt="${this.e(c.name)}"><div><h3>${this.e(c.name)}</h3><label for="trainingThought">Какие детали вы замечаете? О чём эта карта?</label><textarea id="trainingThought" class="academy-input" rows="4" maxlength="10000"></textarea><button id="showTrainingAnswer" class="primary-button" onclick="Academy.revealTraining()">Сравнить с подсказкой</button><div id="trainingAnswer" aria-live="polite"></div></div></div>`;
    },
    revealTraining() {
        const c=this.card(this.trainingCode),k=TarotKnowledge[this.trainingCode];if(!k)return;
        this.answerShown=true; document.getElementById('showTrainingAnswer').disabled=true;
        document.getElementById('trainingAnswer').innerHTML=`<h3>${this.e(k.keywords.join(' · '))}</h3><p>${this.e(k.summary)}</p><p>${this.e(k.symbols[0].name)}: ${this.e(k.symbols[0].text)}</p><button class="text-btn" onclick="Academy.keepTrainingNote()">Сохранить мою версию к карте</button><p id="trainingSave" role="status"></p><p>Как вам далось прочтение?</p><div class="rating-buttons"><button onclick="Academy.rateTraining(false)">Хочу повторить</button><button onclick="Academy.rateTraining(true)">Вспомнила уверенно</button></div>`;
    },
    keepTrainingNote() {
        const text=document.getElementById('trainingThought').value.trim();if(!text)return;
        this.state.notes[this.trainingCode]=[this.state.notes[this.trainingCode],text].filter(Boolean).join('\n\n').slice(0,10000);
        document.getElementById('trainingSave').textContent=this.save()?'Добавлено к личным ассоциациям.':'Не сохранено на устройстве.';
    },
    rateTraining(confident) {
        if(!this.answerShown || !this.trainingCode)return;this.answerShown=false;
        const old=this.state.progress[this.trainingCode]||{level:0,seen:0};
        const level=confident?Math.min(4,old.level+1):0;
        this.state.progress[this.trainingCode]={level,seen:old.seen+1,due:Date.now()+(confident?[1,1,3,7,14][level]*86400000:600000)};
        this.save();this.train();
    },
    compare() {
        if(!this.enter('Две карты — два ракурса'))return;
        const options=this.all().map(c=>`<option value="${c.code}">${this.e(c.name)}</option>`).join('');
        document.getElementById('academyContent').innerHTML=`<div class="compare-controls"><label>Первая карта<select id="compareA" onchange="Academy.renderComparison()">${options}</select></label><label>Вторая карта<select id="compareB" onchange="Academy.renderComparison()">${options}</select></label><label>Контекст<select id="compareContext" onchange="Academy.renderComparison()"><option value="general">Общий</option><option value="love">Отношения</option><option value="work">Работа</option><option value="finance">Финансы</option></select></label></div><p class="source-note">Сравнение прямых положений. Это упражнение, а не фиксированный ответ для любой ситуации.</p><div id="comparisonResult"></div>`;
        document.getElementById('compareB').selectedIndex=1;this.renderComparison();
    },
    renderComparison() {
        const a=this.card(document.getElementById('compareA').value),b=this.card(document.getElementById('compareB').value),key=document.getElementById('compareContext').value;
        if(!a||!b)return;
        if(a.code===b.code){document.getElementById('comparisonResult').innerHTML='<p>Выберите две разные карты.</p>';return;}
        document.getElementById('comparisonResult').innerHTML=`<div class="comparison-grid">${[a,b].map(c=>`<article><img src="${this.e(c.img)}" alt="${this.e(c.name)}"><h3>${this.e(c.name)}</h3><p>${this.e(this.keys(c).join(' · '))}</p><p>${this.e(key==='general'?this.summary(c):c.meanings.direct[key]||'Нет описания')}</p></article>`).join('')}</div><div class="pair-prompts"><h3>Соедините наблюдения</h3><p>${a.arcana==='major'&&b.arcana==='major'?'Оба старших аркана: сравните две большие темы опыта.':a.suit&&a.suit===b.suit?'Одна масть: чем отличаются способы проявления общей темы?':'Разные группы карт: как одна сторона опыта влияет на другую?'}</p><ol><li>Что объединяет эти изображения?</li><li>В чём тема «${this.e(this.keys(a)[0])}» поддерживает или ограничивает тему «${this.e(this.keys(b)[0])}»?</li><li>Как меняется прочтение, если поменять карты местами?</li></ol></div>`;
    },
    calculateStats(days,now=Date.now()) {
        const counts={},suits={major:0,wands:0,cups:0,swords:0,pentacles:0};let total=0,reversed=0,sessions=0,excluded=0;
        for(const item of State.history){
            if(item.schemaVersion!==2 || !Array.isArray(item.cards)){excluded++;continue;}
            const time=Date.parse(item.createdAt);
            if(days && (!Number.isFinite(time)||time<now-days*86400000||time>now))continue;
            sessions++;
            for(const entry of item.cards){const c=this.card(entry.cardId);if(!c)continue;total++;if(entry.orientation==='reversed')reversed++;counts[c.code]=(counts[c.code]||0)+1;suits[c.arcana==='major'?'major':c.suit]++;}
        }
        return {sessions,total,reversed,excluded,counts,suits};
    },
    stats() {
        if(!this.enter('Дневник в цифрах'))return;
        document.getElementById('academyContent').innerHTML='<label for="statsPeriod">Период</label><select id="statsPeriod" class="academy-input" onchange="Academy.renderStats()"><option value="0">Всё время</option><option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select><div id="statsResult"></div>';
        this.renderStats();
    },
    renderStats() {
        const s=this.calculateStats(Number(document.getElementById('statsPeriod').value));
        const names={major:'Старшие арканы',wands:'Жезлы',cups:'Кубки',swords:'Мечи',pentacles:'Пентакли'};
        const top=Object.entries(s.counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
        document.getElementById('statsResult').innerHTML=`<div class="stat-cards"><div><strong>${s.sessions}</strong><span>сеансов</span></div><div><strong>${s.total}</strong><span>карт в записях</span></div><div><strong>${s.total?Math.round(s.reversed/s.total*100):0}%</strong><span>перевёрнутых</span></div></div>${!s.total?'<p>В выбранном периоде пока нет полных раскладов.</p>':`<h3>Распределение карт</h3>${Object.entries(s.suits).map(([k,v])=>`<div class="stat-row"><label for="stat-${k}">${names[k]} · ${v}</label><meter id="stat-${k}" min="0" max="${s.total}" value="${v}">${v} из ${s.total}</meter></div>`).join('')}<h3>Чаще встречались</h3><ol>${top.map(([code,count])=>`<li><button class="text-btn" onclick="Academy.detail('${code}')">${this.e(this.card(code).name)}</button> · ${count}</li>`).join('')}</ol>`}<p class="source-note">Это частоты в вашем дневнике, включая ручные расклады, а не вероятности будущих событий. Старых неполных записей, не включённых в расчёт: ${s.excluded}.</p>`;
    },
    backup() {
        const blob=new Blob([JSON.stringify({type:'polkas-academy',version:1,data:this.state},null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='polkas-learning.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
        this.notice('Резервная копия ассоциаций, прогресса и настроек подготовлена. Дневник экспортируется отдельно.');
    },
    async restore(input) {
        try {
            const file=input.files[0];if(!file)return;if(file.size>2*1024*1024)throw Error('Файл больше 2 МБ');
            const raw=JSON.parse(await file.text());if(raw.type!=='polkas-academy'||raw.version!==1||!raw.data||typeof raw.data!=='object')throw Error('Неизвестный формат');
            if(!confirm('Заменить личные ассоциации, настройки и прогресс данными из копии? Дневник раскладов не изменится.'))return;
            const old=this.state;this.state=this.normalize(raw.data);if(!this.save()){this.state=old;throw Error('Хранилище недоступно');}
            this.syncSettings();this.notice('Обучение восстановлено из копии.');
        } catch(e){this.notice('Восстановление не выполнено: '+e.message);}finally{input.value='';}
    },
    syncSettings(){const r=document.getElementById('useReversals'),f=document.getElementById('firstLookSetting');if(r)r.checked=this.state.settings.reversals;if(f)f.checked=this.state.settings.firstLook;}
};
const originalDetail=UI.showCardDetail.bind(UI);
UI.showCardDetail=function(name){
    const card=Academy.all().find(c=>c.name===name);if(!card)return;
    Academy.returnFocus=document.activeElement;
    const meanings=card.meanings, study=TarotKnowledge[card.code];
    if(study){
        const symbolism=study.symbols.map(s=>s.name+': '+s.text).join(' ');
        card.meanings={...meanings,direct:{...meanings.direct,symbolism},reversed:{...meanings.reversed,symbolism:'Рисунок карты не меняется при перевороте. '+symbolism}};
    }
    try{originalDetail(name);}finally{card.meanings=meanings;}
    Academy.enrich(card);
    document.querySelector('.sheet-close')?.focus();
};
const originalClose=UI.closeCard.bind(UI);
UI.closeCard=function(){originalClose();if(Academy.returnFocus?.isConnected)Academy.returnFocus.focus();Academy.returnFocus=null;};
UI.renderDeckGallery=()=>Academy.gallery();
UI.filterDeck=type=>Academy.filterCards(type);
const originalEditor=Journal.showEditor.bind(Journal);
Journal.showEditor=function(item,saved){
    originalEditor(item,saved);
    const container=document.getElementById('spread-container'),interpretation=container.querySelector('.interpretation-area');
    const panel=document.createElement('section');panel.className='first-look-panel';
    panel.innerHTML=`<h3>Сначала мой взгляд</h3><label for="firstLookNote">Какая деталь привлекла внимание? Что она напоминает?</label><textarea id="firstLookNote" class="academy-input" maxlength="10000" rows="3" oninput="Academy.saveReflection('firstLook','firstLookNote')">${Academy.e(item.firstLook||'')}</textarea><p id="firstLookNoteStatus" role="status"></p><button class="text-btn" onclick="Academy.showInterpretation(this)" aria-expanded="${!Academy.state.settings.firstLook}">${Academy.state.settings.firstLook?'Открыть готовое толкование':'Скрыть готовое толкование'}</button>`;
    if(interpretation){interpretation.hidden=Academy.state.settings.firstLook;interpretation.before(panel);}
    const follow=document.createElement('section');follow.className='follow-up-panel';
    follow.innerHTML=`<h3>Что изменилось позже?</h3><label for="followUpNote">Новые наблюдения по этому раскладу</label><textarea id="followUpNote" class="academy-input" maxlength="10000" rows="3" oninput="Academy.saveReflection('followUp','followUpNote')">${Academy.e(item.followUp||'')}</textarea><p id="followUpNoteStatus" role="status"></p>`;
    container.appendChild(follow);
};
Academy.saveReflection=function(key,id){const item=State.history.find(x=>x.id===Journal.currentId);if(!item||!['firstLook','followUp'].includes(key))return;item[key]=document.getElementById(id).value.slice(0,10000);item.updatedAt=new Date().toISOString();document.getElementById(id+'Status').textContent=HistoryStore.save()?'Сохранено на устройстве.':'Не сохранено. Сделайте экспорт дневника.';};
Academy.showInterpretation=function(button){const area=document.querySelector('.interpretation-area');if(!area)return;area.hidden=!area.hidden;button.setAttribute('aria-expanded',String(!area.hidden));button.textContent=area.hidden?'Открыть готовое толкование':'Скрыть готовое толкование';};
document.addEventListener('DOMContentLoaded',()=>{Academy.read();Academy.syncSettings();});
document.addEventListener('keydown',event=>{
    const modal=document.getElementById('cardModal');if(!modal?.classList.contains('active'))return;
    if(event.key==='Escape'){event.preventDefault();UI.closeCard();return;}
    if(event.key==='Tab'){
        const focusable=[...modal.querySelectorAll('button,a[href],input,textarea,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.getClientRects().length);
        const first=focusable[0],last=focusable[focusable.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
});
