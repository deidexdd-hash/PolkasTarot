// Full local application and real DOM events. jsdom does not verify visual layout.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const root=path.resolve(__dirname,'..');
class LocalResources extends ResourceLoader{
 fetch(url){const u=new URL(url);if(u.hostname!=='polkas.test')return null;const file=path.resolve(root,'.'+u.pathname);return file.startsWith(root+path.sep)&&fs.existsSync(file)?Promise.resolve(fs.readFileSync(file)):null;}
}
async function until(test){for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out waiting for the page');}
async function mount({hash='#layouts=horseshoe',fail=0,denied=false,deckError=false}={}){
 const errors=[],requests=[],storage=new Map(),vc=new VirtualConsole();let libraryFailures=fail;
 vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(root,'index.html'),{
  url:'https://polkas.test/'+hash,virtualConsole:vc,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){
   w.fetch=async url=>{requests.push(String(url));if(String(url)==='data/spread-library.json'&&libraryFailures-->0)return {ok:false};if(deckError&&String(url)==='data/cards.json')throw Error('Deck unavailable');return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url))))};};
   Object.defineProperty(w,'localStorage',{value:{getItem:k=>{if(denied)throw Error('denied');return storage.get(k)||null;},setItem:(k,v)=>{if(denied)throw Error('denied');storage.set(k,String(v));}}});
   w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;
  }
 });
 await until(()=>dom.window.SpreadLibrary&&dom.window.document.querySelector('.book-title'));
 return {dom,w:dom.window,errors,requests,storage};
}
(async()=>{
 const app=await mount(),{w,errors,requests}=app,$=s=>w.document.querySelector(s),all=s=>Array.from(w.document.querySelectorAll(s));
 try{
  await until(()=>w.DeckLoader.loaded&&$('.layout-title'));
  const lib=w.SpreadLibrary,items=lib.data.items;
  assert.equal($('.layout-title').textContent,'Подкова');assert.equal(w.State.history.length,0);
  for(const item of items){
   await lib.open(item.key);assert.equal($('.layout-title').textContent,item.title);
   assert.equal(all('.layout-diagram rect').length,item.positions.length);assert.equal(all('.layout-positions>li').length,item.positions.length);
   assert.equal(all('.layout-example .author-card-link').length,item.positions.length);
   assert.equal(new URLSearchParams(w.location.hash.slice(1)).get('layouts'),item.key);
   assert.notEqual(w.getComputedStyle($('#layoutDraw')).display,'none');
  }
  assert.equal(w.State.history.length,0,'All guides and examples are read without generating readings');
  assert.equal(requests.filter(x=>x==='data/spread-library.json').length,1);
  await lib.open();assert.equal(all('.layout-tile').length,20);
  $('#layoutNew').click();assert.equal(all('.layout-tile').length,12);
  $('#layoutCategory').value='cycles';$('#layoutCategory').dispatchEvent(new w.Event('change'));
  $('#layoutMax').value='7';$('#layoutMax').dispatchEvent(new w.Event('change'));assert.equal(all('.layout-tile').length,4);
  $('#layoutSearch').value='новолуние';$('#layoutSearch').dispatchEvent(new w.Event('input'));assert.equal(all('.layout-tile').length,1);
  $('.layout-tile').click();await until(()=>$('.layout-title')?.textContent==='Новолуние · начало цикла');
  $('#layoutBack').click();await until(()=>$('#layoutSearch'));assert.equal($('#layoutSearch').value,'новолуние');
  $('#layoutSearch').value='<img src=x onerror=alert(1)>';$('#layoutSearch').dispatchEvent(new w.Event('input'));
  assert.equal(all('.layout-tile').length,0);assert.equal(all('img[src="x"]').length,0);
  $('#layoutReset').click();assert.equal(all('.layout-tile').length,20);
  w.Academy.state.settings.reversals=false;w.Academy.state.settings.firstLook=true;
  for(const item of items){
   await lib.open(item.key);
   const q='Мой вопрос о схеме '+item.key+' <img src=x onerror=alert(1)>';
   $('#layoutQuestion').value=q;$('#layoutDraw').click();
   await until(()=>all('.layout-reading-position').length===item.positions.length);
   const record=w.State.history[0];assert.equal(record.spreadKey,item.key);assert.equal(record.question,q);assert(w.Journal.validate(record));
   assert.equal(all('.card-item').length,item.positions.length);assert(record.cards.every(c=>c.orientation==='direct'));
   assert.equal($('.interpretation-area').hidden,true,'First-look setting also applies to new layouts');
   assert.equal(all('img[src="x"]').length,0);assert($('.layout-reading-guide').textContent.includes(item.journal[0]));
   assert.equal(w.App.readLink().spreadKey,item.key,'Shared links support every spread');
  }
  assert.equal(w.State.history.length,20);
  const lastQuestion=w.State.history[0].question;
  $('.layout-reading-guide>.text-btn').click();await until(()=>$('#layoutQuestion'));
  assert.equal($('#layoutQuestion').value,lastQuestion,'Guide reached from a personal reading retains its question');
  for(const item of items.filter(s=>s.added)){
   await lib.open(item.key);$('[data-question="1"]').click();assert.equal($('#layoutQuestion').value,item.questions[1]);
   const before=w.State.history.length;$('#layoutManual').click();
   assert.equal($('#manualSpread').value,item.key);assert.equal($('#manualQuestion').value,item.questions[1]);
   assert.equal(all('#manualPositions fieldset').length,item.positions.length);assert.equal(w.State.history.length,before);
   assert(all('#manualPositions select').every(s=>s.value===''),'Examples are never preselected in personal readings');
   item.positions.forEach((p,i)=>{$('#manualCard'+i).value=p.example.card;});$('#manualReverse0').checked=true;
   $('#manualQuestion').value='Свой вопрос: '+item.key;$('.manual-form .primary-button').click();
   await until(()=>all('.layout-reading-position').length===item.positions.length);
   const record=w.State.history[0];assert.equal(record.source,'manual');assert.equal(record.cards[0].orientation,'reversed');assert.equal(record.question,'Свой вопрос: '+item.key);assert(w.Journal.validate(record));
  }
  $('#readingNotes').value='Мой следующий шаг';$('#readingNotes').dispatchEvent(new w.Event('input'));
  const saved=JSON.stringify(w.State.history),payload=JSON.stringify({schemaVersion:2,readings:w.State.history});
  w.State.history=[];w.HistoryStore.load();assert.equal(JSON.stringify(w.State.history),saved);
  w.Journal.open(0);await until(()=>all('.layout-reading-position').length===12);assert.equal($('#readingNotes').value,'Мой следующий шаг');
  const snapshot=JSON.stringify(w.State.history[0].cards);
  const input={files:[{size:payload.length,text:async()=>payload}],value:'file'};
  w.State.history=[];await w.Journal.importData(input);assert.equal(w.State.history.length,32);
  await w.Journal.importData(input);assert.equal(w.State.history.length,32);assert.equal(JSON.stringify(w.State.history[0].cards),snapshot);
  // A saved, edited schema must not receive current position guidance.
  const changed=w.State.history[0];changed.config.labels[0]='Другая позиция';w.Journal.open(0);
  await new Promise(r=>setTimeout(r,20));assert.equal(all('.layout-reading-position').length,0);
  // A late catalog response may not replace another screen or append stale hints.
  lib.data=null;let resolve;const fetch=w.fetch;
  w.fetch=()=>new Promise(r=>{resolve=r;});
  const pending=lib.open('week');w.App.showHome();resolve({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'data/spread-library.json')))});
  await pending;assert.equal($('.book-shell'),null);
  lib.data=null;w.App.doSpread('horseshoe',{question:'Проверка перехода'});w.App.showHome();
  resolve({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'data/spread-library.json')))});
  await lib.pending;await new Promise(r=>setTimeout(r,10));assert.equal($('.layout-reading-position'),null);w.fetch=fetch;
  await lib.open("' onclick='bad");assert.equal(all('.layout-tile').length,20);assert(!w.location.hash.includes('onclick'));
  assert.deepEqual(errors,[]);
 }finally{app.dom.window.close();}
 const retry=await mount({fail:1});
 try{assert(retry.w.document.querySelector('#layoutRetry'));retry.w.document.querySelector('#layoutRetry').click();await until(()=>retry.w.document.querySelector('.layout-title'));assert.equal(retry.requests.filter(x=>x==='data/spread-library.json').length,2);assert.deepEqual(retry.errors,[]);}finally{retry.dom.window.close();}
 const offline=await mount({denied:true,deckError:true});
 try{await new Promise(r=>setTimeout(r,60));assert.equal(offline.w.document.querySelector('.layout-title').textContent,'Подкова');assert.equal(offline.w.State.history.length,0,'Guides are usable when the deck or storage is unavailable');assert(!offline.errors.some(e=>e.includes('Uncaught')));}finally{offline.dom.window.close();}
 console.log('PASS DOM: all 20 guide routes and virtual readings; 12 empty manual forms and orientations; filters/presets; diary reload/import/deduplication; shared links; escaping; first-look mode; stale snapshots/responses; retry; reading without deck or storage');
})().catch(e=>{console.error(e);process.exit(1);});
