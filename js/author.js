/* Practical companion to the manuscript. Source content stays in book.json. */
window.Author = {
    data:null,pending:null,workbookPending:null,tab:'cards',request:0,target:null,
    e(value){return UI.escape(String(value??''));},
    tabs:{cards:'78 карт',lessons:'34 урока',pairs:'24 сочетания',cases:'8 разборов',courts:'Придворные карты',lenormand:'Ленорман · 36',practices:'8 практик'},
    async load(tab='cards'){
        if(!this.data){
            if(!this.pending)this.pending=fetch('data/author-materials.json').then(r=>{if(!r.ok)throw Error('materials');return r.json();}).then(d=>{this.data=d;return d;}).finally(()=>{this.pending=null;});
            await this.pending;
        }
        if(['pairs','cases','courts'].includes(tab)&&!this.data[tab]){
            if(!this.workbookPending)this.workbookPending=fetch('data/author-workbook.json').then(r=>{if(!r.ok)throw Error('workbook');return r.json();}).then(d=>{
                for(const key of ['pairs','cases','courts','guides'])this.data[key]=d[key];
            }).finally(()=>{this.workbookPending=null;});
            await this.workbookPending;
        }
        return this.data;
    },
    async open(tab='cards',id=null){
        const token=++this.request;
        if(!Object.hasOwn(this.tabs,tab))tab='cards';
        this.target={tab,id};
        Book.track();Book.current=null;Book.shell();
        const root=document.getElementById('bookContent');
        root.innerHTML='<p role="status">Открываем материалы…</p>';
        try{await this.load(tab);if(token!==this.request||!root.isConnected)return false;
            this.tab=tab;this.render(id);return true;
        }catch(_){if(token===this.request&&root.isConnected)root.innerHTML='<h2>Не удалось открыть материалы</h2><p>Проверь соединение и попробуй ещё раз.</p><button class="primary-button" onclick="Author.retryOpen()">Повторить</button>';return false;}
    },
    retryOpen(){return this.open(this.target?.tab,this.target?.id);},
    route(id){try{const p=new URLSearchParams({study:this.tab});if(id)p.set('id',id);history.replaceState(null,'','#'+p);}catch(_){}},
    render(id){
        const root=document.getElementById('bookContent');if(!root)return;
        const items=this.data[this.tab];const item=id?items.find(x=>(x.code||x.id)===String(id)):null;
        this.route(item?(item.code||item.id):null);
        root.innerHTML=`<button class="text-btn" onclick="Book.open()">← Читать книгу</button><p class="eyebrow">ДОПОЛНЕНИЕ К КНИГЕ</p><h2 class="book-title" tabindex="-1">Практическое продолжение</h2><nav class="author-tabs" aria-label="Авторские материалы">${Object.entries(this.tabs).map(([key,label])=>`<button class="text-btn" ${key===this.tab?'aria-current="page"':''} onclick="Author.open('${key}')">${label}</button>`).join('')}</nav><div id="authorBody"></div>`;
        if(item)this.detail(item);
        else this.list();
        Book.focus();
    },
    list(){
        const intro=this.data.guides?.[this.tab]||(this.tab==='lenormand'?this.data.lenormandGuide:this.data.editorialNote);
        document.getElementById('authorBody').innerHTML=`<p class="author-intro">${this.e(intro)}</p>${this.tab==='cards'?`<details class="author-guide"><summary>Как пользоваться описаниями</summary><p>${this.e(this.data.readingGuide)}</p></details>`:''}<label for="authorSearch">Найти по названию, карте или теме</label><input id="authorSearch" class="academy-input" type="search" placeholder="Например: границы, забота, выбор" oninput="Author.filter()">${this.tab==='cards'?`<label for="authorSuit">Часть колоды</label><select id="authorSuit" class="academy-input" onchange="Author.filter()"><option value="all">Все 78 карт</option><option value="major_arcana">Старшие арканы</option><option value="wands">Жезлы</option><option value="cups">Кубки</option><option value="swords">Мечи</option><option value="pentacles">Пентакли</option></select>`:''}<p id="authorCount" class="book-meta" role="status"></p><div id="authorResults"></div><details class="book-sources"><summary>О текстах и источниках</summary>${this.data.sources.map(s=>`<p><strong>${this.e(s.title)}</strong><br>${this.e(s.kind)}${s.url?` <a href="${this.e(s.url)}" target="_blank" rel="noopener noreferrer">Открыть источник</a>`:''}</p>`).join('')}</details>`;
        this.filter();
    },
    search(tab,query='',suit='all'){
        const q=String(query).toLocaleLowerCase('ru').replaceAll('ё','е').trim();
        return this.data[tab].filter(item=>{
            if(tab==='cards'&&suit!=='all'&&!item.code.split('.').includes(suit))return false;
            // Only visible prose participates; identifiers do not create noisy matches.
            const text=this.searchText(item)+' '+this.subtitle(item,tab);
            return text.toLocaleLowerCase('ru').replaceAll('ё','е').includes(q);
        });
    },
    card(code){return this.data?.cards.find(c=>c.code===code);},
    searchText(value,key=''){
        if(['code','id','chapter','origin','img','spread'].includes(key))return '';
        if(key==='card')return this.card(value)?.name||'';
        if(key==='cards')return value.map(code=>this.card(code)?.name||'').join(' ');
        if(key==='with')return this.data.lenormand.find(c=>c.id===value)?.name||'';
        if(typeof value==='string')return value;
        if(Array.isArray(value))return value.map(v=>this.searchText(v)).join(' ');
        return value&&typeof value==='object'?Object.entries(value).map(([k,v])=>this.searchText(v,k)).join(' '):'';
    },
    subtitle(item,tab=this.tab){
        if(tab==='pairs')return item.cards.map(code=>this.card(code)?.name).join(' + ');
        if(tab==='cases')return Spreads.types[item.spread].title+' · Учебный пример';
        if(tab==='courts')return item.roles.map(r=>this.card(r.card)?.name).join(' · ');
        return item.name?(item.title||item.theme):item.duration||'Урок к главе '+item.chapter;
    },
    filter(){
        const q=document.getElementById('authorSearch')?.value||'',suit=document.getElementById('authorSuit')?.value||'all';
        const items=this.search(this.tab,q,suit);
        document.getElementById('authorCount').textContent=`Найдено: ${items.length}`;
        document.getElementById('authorResults').innerHTML=items.map(x=>`<button class="book-row" onclick="Author.open('${this.tab}','${x.code||x.id}')"><span>${String(this.data[this.tab].indexOf(x)+1).padStart(2,'0')}</span><span><strong>${this.e(x.name||x.title)}</strong><small>${this.e(this.subtitle(x))}</small></span><span aria-hidden="true">↗</span></button>`).join('')||'<p>Совпадений нет. Попробуй другое слово или измени фильтр.</p>';
    },
    prose(sections){return `<div class="book-prose author-prose">${sections.map(([title,text])=>`<section><h3>${this.e(title)}</h3><p>${this.e(text)}</p></section>`).join('')}</div>`;},
    cardLink(code){const c=this.card(code);return c?`<button class="author-card-link" onclick="Author.open('cards','${c.code}')"><img src="${this.e(c.img)}" alt="" width="120" height="206" loading="lazy"><span>${this.e(c.name)}</span></button>`:'';},
    detail(item){
        const tab=this.tab,body=document.getElementById('authorBody');
        let content=`<button class="text-btn" onclick="Author.open('${tab}')">← К списку</button><h3 class="author-title">${this.e(item.name||item.title)}</h3>`;
        if(tab==='cards'){
            content+=`<p class="author-lead">${this.e(item.title)}</p><img class="author-card-image" src="${this.e(item.img)}" alt="${this.e(item.name)}" width="210" height="360">`;
            content+=this.prose([['Образ',item.image],['Смысл',item.meaning],['Ресурс',item.resource],['Где становится трудно',item.shadow],['Перевёрнутое положение: другой ракурс',item.reversed],['Вопрос к себе',item.question],['Попробуй сегодня',item.practice]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.startCard('${item.code}')">Моя практика с картой</button><button class="text-btn" onclick="Academy.detail('${item.code}')">Карта в атласе</button><button class="text-btn" onclick="Book.open('${item.chapter}')">Глава ${item.chapter} книги</button></div>`;
            content+=`<div class="book-actions"><button class="text-btn" onclick="Author.related('pairs','${item.code}')">Сочетания с этой картой</button><button class="text-btn" onclick="Author.related('cases','${item.code}')">Карта в учебных разборах</button>${/\.(page|knight|queen|king)$/.test(item.code)?`<button class="text-btn" onclick="Author.related('courts','${item.code}')">Уроки об этой придворной карте</button>`:''}</div>`;
        }else if(tab==='lessons'){
            content+=this.prose([['Главная мысль',item.idea],['Пример',item.example],['Вопрос к себе',item.question],['Задание',item.exercise],['Что стоит сохранить',item.takeaway]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Book.open('${item.chapter}')">Читать главу ${item.chapter}</button><button class="text-btn" onclick="Author.open('practices')">Перейти к практикам</button></div>`;
            if(['12','13'].includes(item.chapter))content+=`<div class="book-actions"><button class="text-btn" onclick="Author.open('pairs')">Сочетания карт</button><button class="text-btn" onclick="Author.open('cases')">Разборы раскладов</button><button class="text-btn" onclick="Author.open('courts')">Придворные карты</button></div>`;
        }else if(tab==='lenormand'){
            const pair=this.data.lenormand.find(x=>x.id===item.pair.with);
            content+=`<p class="author-lead">${this.e(item.theme)}</p>`+this.prose([['Образ в разговоре',item.meaning],['Вопрос к себе',item.question],['Небольшая практика',item.practice],['Пример связи: '+item.name+' + '+pair.name,item.pair.text]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.open('lenormand','${pair.id}')">${this.e(pair.name)} · вторая карта</button><button class="text-btn" onclick="Book.open('14')">Ленорман в книге</button></div>`;
        }else if(tab==='practices'){
            content+=`<p class="book-meta">${this.e(item.duration)}</p><p class="author-lead">${this.e(item.intro)}</p><ol class="author-steps">${item.steps.map(step=>`<li>${this.e(step)}</li>`).join('')}</ol>`+this.prose([['Вопросы для записи',item.questions.join(' ')],['Завершение',item.closing]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.startPractice('${item.id}')">Открыть дневник практики</button><button class="text-btn" onclick="Book.open('${item.chapter}')">Связанная глава</button></div>`;
        }else if(tab==='pairs'){
            content+=`<p class="author-intro">${this.e(this.data.guides.pairs)}</p><div class="author-card-pair">${item.cards.map(code=>this.cardLink(code)).join('')}</div>`;
            content+=this.prose([['Ситуация',item.context],['Как связать образы',item.reading],['Другой возможный ракурс',item.alternative],['Вопрос для проверки',item.question],['Попробуй самостоятельно',item.exercise]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.comparePair('${item.id}')">Сравнить эти карты</button><button class="text-btn" onclick="Book.open('${item.chapter}')">Связанная глава</button></div>`;
        }else if(tab==='cases'){
            content+=`<p class="book-meta">${this.e(this.subtitle(item))}</p><p class="author-intro">${this.e(this.data.guides.cases)}</p>`+this.prose([['Исходная ситуация',item.scenario],['Вопрос к раскладу',item.question]]);
            content+=`<h3 class="author-section-title">Читаем по позициям</h3><ol class="author-positions">${item.positions.map((p,i)=>`<li><h4>${i+1}. ${this.e(p.label)}</h4><div class="author-position-content">${this.cardLink(p.card)}<p>${this.e(p.reading)}</p></div></li>`).join('')}</ol>`;
            content+=this.prose([['Собираем общую мысль',item.synthesis],['Проверяем другую версию',item.alternative],['Самостоятельная работа',item.exercise]]);
            content+=`<div class="book-actions"><button class="primary-button" onclick="Author.startCase('${item.id}')">Мой расклад по этой схеме</button><button class="text-btn" onclick="Book.open('${item.chapter}')">Связанная глава</button></div>`;
        }else if(tab==='courts'){
            content+=`<p class="author-intro">${this.e(this.data.guides.courts)}</p>`+this.prose([['Как смотреть на эту роль',item.core],['Пример из жизни',item.example]]);
            content+=`<h3 class="author-section-title">Четыре ракурса</h3><ul class="author-positions">${item.roles.map(r=>`<li><div class="author-position-content">${this.cardLink(r.card)}<div><p>${this.e(r.text)}</p><button class="text-btn" onclick="Author.startCourt('${item.id}','${r.card}')">Моя практика с этой картой</button></div></div></li>`).join('')}</ul>`;
            content+=this.prose([['Что легко перепутать',item.misreading],['Вопрос к себе',item.question],['Задание',item.exercise]]);
            content+=`<div class="book-actions"><button class="text-btn" onclick="Book.open('13')">Придворные карты в книге</button><button class="text-btn" onclick="Author.open('practices','four-lenses')">Практика «Четыре ракурса»</button></div>`;
        }
        const list=this.data[tab],n=list.indexOf(item),prev=list[n-1],next=list[n+1];
        content+=`<nav class="book-pagination" aria-label="Материалы по порядку">${prev?`<button class="text-btn" onclick="Author.open('${tab}','${prev.code||prev.id}')">← Предыдущий материал</button>`:'<span></span>'}${next?`<button class="text-btn" onclick="Author.open('${tab}','${next.code||next.id}')">Следующий материал →</button>`:''}</nav><p class="source-note">Дополнение к «Карте как зеркалу». Вопросы и упражнения можно пропустить; личный отклик не требует совпадения с текстом.</p>`;
        body.innerHTML=content;
    },
    async related(tab,code){
        const card=this.card(code);if(!card||!['pairs','cases','courts'].includes(tab))return;
        if(await this.open(tab)){const field=document.getElementById('authorSearch');if(field){field.value=card.name;this.filter();}}
    },
    comparePair(id){
        const p=this.data?.pairs?.find(x=>x.id===id);if(!p||!App.deckReady())return;
        Book.current=null;Academy.compare();
        document.getElementById('compareA').value=p.cards[0];document.getElementById('compareB').value=p.cards[1];
        document.getElementById('compareContext').value='general';Academy.renderComparison();
    },
    startCase(id){
        const c=this.data?.cases?.find(x=>x.id===id);if(!c||!App.deckReady())return;
        Book.current=null;Journal.showManual();
        document.getElementById('manualSpread').value=c.spread;Journal.manualFields();
        document.getElementById('manualQuestion').value=c.question;
        const note=document.createElement('aside');note.className='author-case-prompt';
        note.innerHTML=`<h3>${this.e(c.title)}</h3><p>${this.e(c.exercise)}</p><p>Укажи карты своей колоды и при желании измени вопрос. Можно вернуться к примеру, пока расклад не сохранён.</p><button class="text-btn" onclick="Author.open('cases','${c.id}')">Вернуться к разбору</button>`;
        document.getElementById('manualPositions').before(note);
    },
    startCourt(id,code){
        const c=this.data?.courts?.find(x=>x.id===id);if(c?.roles.some(r=>r.card===code))this.start(code,c.chapter,c.title+' · '+c.question,[c.exercise]);
    },
    startCard(code){const c=this.data?.cards.find(x=>x.code===code);if(c)this.start(c.code,c.chapter,c.name+' · '+c.question,[c.practice]);},
    startPractice(id){const p=this.data?.practices.find(x=>x.id===id);if(p)this.start(p.card,p.chapter,p.title+' · '+p.questions.join(' '),p.steps,p.closing);},
    start(code,chapter,question,steps,closing=''){
        if(!App.deckReady())return;
        Book.current=null;
        Book.practice(null,{card:code,chapter,question,exercise:{steps:[...steps],closing}});

    }
};
