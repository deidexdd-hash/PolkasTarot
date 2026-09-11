/* Author manuscript, device-local reading position, and diary-backed practices. */
window.Book = {
    data:null, pending:null, current:null, position:{chapter:'prologue',block:0,size:19},
    e(value){return UI.escape(String(value ?? ''));},
    async load(){
        if(this.data)return this.data;
        if(!this.pending)this.pending=fetch('data/book.json').then(r=>{if(!r.ok)throw Error('book');return r.json();}).then(d=>{this.data=d;return d;}).finally(()=>{this.pending=null;});
        return this.pending;
    },
    read(){try{const p=JSON.parse(localStorage.getItem('polkas-book-v1'));if(p&&typeof p.chapter==='string')this.position={chapter:p.chapter,block:Number.isInteger(p.block)?Math.max(0,p.block):0,size:[17,19,22].includes(p.size)?p.size:19};}catch(_){}},
    persist(){try{localStorage.setItem('polkas-book-v1',JSON.stringify(this.position));return true;}catch(_){return false;}},
    shell(){UI.closeCard();App.setView('book');Daily.select('academy');document.getElementById('spread-container').innerHTML='<section class="book-shell" aria-label="Карта как зеркало"><div id="bookContent"><p role="status">Открываем книгу…</p></div></section>';},
    async open(id, block=0){
        this.shell();const target=document.getElementById('bookContent');
        try{await this.load();if(!target.isConnected)return;
            if(id===undefined){this.contents();return;}
            this.chapter(id,block);
        }catch(_){if(target.isConnected)target.innerHTML='<h2>Книга пока недоступна</h2><p>Проверьте соединение и попробуйте ещё раз.</p><button class="primary-button" onclick="Book.open()">Повторить</button>';}
    },
    route(id,block=0){try{history.replaceState(null,'','#'+new URLSearchParams({book:id,b:String(block)}));}catch(_){}},
    contents(){
        this.current=null;this.route('contents');
        const last=this.data.chapters.find(c=>c.id===this.position.chapter)||this.data.chapters[0];
        document.getElementById('bookContent').innerHTML=`<p class="eyebrow">АВТОРСКАЯ КНИГА</p><h2 tabindex="-1" class="book-title">Карта как зеркало</h2><p class="book-subtitle">${this.e(this.data.subtitle)}</p><div class="book-actions"><button class="primary-button" onclick="Book.chapter('${last.id}',${this.position.block})">Продолжить чтение</button><button class="text-btn" onclick="Book.practice()">Практика «Зеркало»</button></div><p class="book-meta">${this.e(last.title)} · 34 главы</p><label for="bookSearch">Найти в книге</label><input id="bookSearch" class="academy-input" type="search" placeholder="Глава, карта или тема" oninput="Book.filter(this.value)"><div id="bookContents"></div><details class="book-sources"><summary>Источники и дальнейшее чтение</summary>${this.data.sources.map(s=>`<p>${this.e(s.text)} ${s.url?`<a href="${this.e(s.url)}" target="_blank" rel="noopener noreferrer">Открыть источник</a>`:''}</p>`).join('')}</details>`;
        this.filter('');this.focus();
    },
    filter(query){
        const q=query.trim().toLocaleLowerCase('ru');let part='';let found=0;
        document.getElementById('bookContents').innerHTML=this.data.chapters.map(c=>{
            const hit=c.blocks.findIndex(b=>b.text.toLocaleLowerCase('ru').includes(q));
            if(q&&!c.title.toLocaleLowerCase('ru').includes(q)&&hit<0)return '';
            found++;const heading=part!==c.part?(part=c.part,`<h3 class="book-part">${this.e(part||'Начало')}</h3>`):'';
            return `${heading}<button class="book-row" onclick="Book.chapter('${c.id}',${q?Math.max(0,hit):0})"><span>${/^\d+$/.test(c.id)?c.id.padStart(2,'0'):'•'}</span><span><strong>${this.e(c.title)}</strong>${q&&hit>=0?`<small>${this.e(c.blocks[hit].text.slice(0,170))}…</small>`:''}</span><span aria-hidden="true">↗</span></button>`;
        }).join('')||'<p>Совпадений нет. Попробуйте другое слово.</p>';
    },
    chapter(id,block=0){
        const c=this.data.chapters.find(c=>c.id===String(id));if(!c){this.contents();return;}
        const n=this.data.chapters.indexOf(c);block=Math.min(Math.max(0,Number(block)||0),Math.max(0,c.blocks.length-1));
        this.current=c;this.position.chapter=c.id;this.position.block=block;const saved=this.persist();this.route(c.id,block);
        document.getElementById('bookContent').innerHTML=`<div class="book-controls"><button class="text-btn" onclick="Book.contents()">← Содержание</button><label>Текст <select aria-label="Размер текста книги" onchange="Book.resize(this.value)">${[17,19,22].map(s=>`<option value="${s}" ${s===this.position.size?'selected':''}>${s===17?'Обычный':s===19?'Крупный':'Очень крупный'}</option>`).join('')}</select></label></div><p class="eyebrow">${this.e(c.part||'КАРТА КАК ЗЕРКАЛО')}</p><h2 tabindex="-1" class="book-title">${this.e(c.title)}</h2><p class="book-meta">${Math.max(1,Math.ceil(c.blocks.map(b=>b.text).join(' ').split(/\s+/).length/180))} мин чтения</p><article class="book-prose" style="--book-size:${this.position.size}px">${c.blocks.map((b,i)=>`<${b.type==='heading'?'h3':'p'} id="book-p-${i}" data-book-block="${i}">${this.e(b.text)}${b.card?` <button class="text-btn book-card-link" onclick="Academy.detail('${b.card}')">Посмотреть карту ↗</button>`:''}</${b.type==='heading'?'h3':'p'}>`).join('')}</article><div class="book-actions"><button class="primary-button" onclick="Book.practice()">Перейти к практике</button><button class="text-btn" onclick="Book.mark()">Запомнить это место</button></div><p id="bookStatus" role="status">${saved?'Место чтения сохраняется на этом устройстве.':'Место чтения не сохранено: хранилище недоступно.'}</p><nav class="book-pagination" aria-label="Главы книги">${n?`<button class="text-btn" onclick="Book.chapter('${this.data.chapters[n-1].id}')">← Предыдущая глава</button>`:'<span></span>'}${n<this.data.chapters.length-1?`<button class="text-btn" onclick="Book.chapter('${this.data.chapters[n+1].id}')">Следующая глава →</button>`:''}</nav><details class="book-sources"><summary>Источники к книге</summary>${this.data.sources.map(s=>`<p>${this.e(s.text)} ${s.url?`<a href="${this.e(s.url)}" target="_blank" rel="noopener noreferrer">Источник</a>`:''}</p>`).join('')}</details>`;
        this.focus(block);
    },
    focus(block){const el=document.querySelector(block===undefined?'.book-title':`#book-p-${block}`)||document.querySelector('.book-title');if(el){el.setAttribute('tabindex','-1');el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:'instant'});}},
    resize(value){this.position.size=[17,19,22].includes(Number(value))?Number(value):19;document.querySelector('.book-prose').style.setProperty('--book-size',this.position.size+'px');this.persist();},
    mark(){this.track();const el=document.getElementById('bookStatus');if(el)el.textContent=this.persist()?'Место чтения сохранено.':'Не удалось сохранить место чтения на устройстве.';},
    track(){if(!document.querySelector('.book-prose')||!this.current)return;const blocks=[...document.querySelectorAll('[data-book-block]')];const b=blocks.find(p=>p.getBoundingClientRect().bottom>120);if(b){this.position.block=Number(b.dataset.bookBlock);this.persist();this.route(this.current.id,this.position.block);}},
    async forCard(code){await this.open(code.startsWith('major_arcana.')?'12':'13');if(this.current?.id==='12'){const i=this.current.blocks.findIndex(b=>b.card===code);if(i>=0){this.position.block=i;this.persist();this.route('12',i);this.focus(i);}}},
    practice(itemId){
        if(!App.deckReady())return;
        const item=State.history.find(x=>x.id===itemId&&x.bookPractice===true);
        this.practiceId=item?.id||null;this.practiceChapter=item?.bookChapter||this.current?.id||'prologue';
        this.shell();App.setLink(null);this.current=null;
        const code=item?.cards[0].cardId||Journal.cards()[0].code;
        document.getElementById('bookContent').innerHTML=`<button class="text-btn" onclick="Book.open('${this.practiceChapter}')">← Вернуться к книге</button><p class="eyebrow">ПРАКТИКА ПО КНИГЕ</p><h2 tabindex="-1" class="book-title">Карта как зеркало</h2><p>Выберите изображение. Сначала опишите то, что видите, затем — свою ассоциацию. Единственного правильного ответа здесь нет.</p><label for="mirrorCard">Карта для размышления</label><select id="mirrorCard" class="academy-input" onchange="Book.practiceImage()" ${item?'disabled':''}>${Journal.cards().map(c=>`<option value="${c.code}" ${c.code===code?'selected':''}>${this.e(c.name)}</option>`).join('')}</select><div id="mirrorImage"></div>${[['question','Мой вопрос или ситуация',item?.question],['firstLook','Какие три детали я вижу? Что чувствую?',item?.firstLook],['notes','Что это напоминает мне в моей жизни?',item?.notes],['followUp','Какой небольшой шаг я выбираю? Что изменилось позже?',item?.followUp]].map(([key,label,value])=>`<label for="mirror-${key}">${label}</label><textarea id="mirror-${key}" class="academy-input" rows="3" maxlength="10000">${this.e(value||'')}</textarea>`).join('')}<div class="book-actions"><button class="primary-button" onclick="Book.savePractice()">Сохранить в дневник</button><button class="text-btn" onclick="Daily.journal()">Открыть дневник</button></div><p id="mirrorStatus" role="status">Ответы сохраняются только на этом устройстве и входят в экспорт дневника.</p>`;
        this.practiceImage();this.focus();
    },
    practiceImage(){const c=Academy.card(document.getElementById('mirrorCard').value);if(c)document.getElementById('mirrorImage').innerHTML=`<img src="${this.e(c.img)}" alt="${this.e(c.name)}" width="180" height="310"><p>${this.e(c.name)}</p>`;},
    savePractice(){
        const c=Academy.card(document.getElementById('mirrorCard').value);if(!c)return;
        let item=State.history.find(x=>x.id===this.practiceId);
        if(!item){const cfg={...Spreads.types.daily,title:'Карта как зеркало'};item=Journal.create('daily',[{cardId:c.code,name:c.name,img:c.img,orientation:'direct',label:'Мой образ'}],cfg,'',App.today(),'manual');item.bookPractice=true;item.bookChapter=this.practiceChapter;item.tags='книга, зеркало';State.history.unshift(item);this.practiceId=item.id;document.getElementById('mirrorCard').disabled=true;}
        for(const key of ['question','firstLook','notes','followUp'])item[key]=document.getElementById('mirror-'+key).value.slice(0,10000);
        item.updatedAt=new Date().toISOString();const saved=HistoryStore.save();UI.renderHistory();document.getElementById('mirrorStatus').textContent=saved?'Практика сохранена в дневнике. Можно вернуться и дополнить ответы.':'Не сохранено на устройстве. Экспортируйте дневник до закрытия вкладки.';
    }
};
const bookJournalOpen=Journal.open.bind(Journal);
Journal.open=function(index){const item=State.history[index];if(item?.bookPractice===true&&this.validate(item)){Book.practice(item.id);return;}bookJournalOpen(index);};
const bookEnrich=Academy.enrich.bind(Academy);
Academy.enrich=function(c){bookEnrich(c);const panel=document.querySelector('.card-study');if(panel){const b=document.createElement('button');b.className='book-card-entry text-btn';b.textContent='Карта как зеркало · читать в книге ↗';b.onclick=()=>Book.forCard(c.code);panel.appendChild(b);}};
Book.read();
let bookScrollTimer;
window.addEventListener('scroll',()=>{clearTimeout(bookScrollTimer);bookScrollTimer=setTimeout(()=>Book.track(),180);},{passive:true});
window.addEventListener('pagehide',()=>Book.track());
