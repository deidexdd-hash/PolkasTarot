// Functional tests without browser dependencies. Browser layout is not covered.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),storage=new Map(),nodes=new Map();let denied=false;
function element(){return {innerHTML:'',textContent:'',value:'',checked:false,hidden:false,disabled:false,selectedIndex:0,style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},appendChild(){},insertBefore(){},before(){},after(){},focus(){},setAttribute(){},querySelector(){return null;},querySelectorAll(){return[];},scrollIntoView(){},remove(){},click(){}};}
function get(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
const ctx={console:{log(){},warn(){},error(){}},crypto:require('node:crypto').webcrypto,URLSearchParams,Uint32Array,Date,Math,Blob,URL,
 document:{getElementById:get,querySelector:()=>null,querySelectorAll:()=>[],createElement:element,addEventListener(){},body:element()},
 localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(denied)throw Error('denied');storage.set(k,v);}},
 setTimeout(){},location:{hash:'',pathname:'/',search:''},history:{replaceState(a,b,url){ctx.location.hash=url.startsWith('#')?url:'';}},scrollTo(){},alert(m){throw Error(m);},confirm:()=>true};
ctx.window=ctx;vm.createContext(ctx);
for(const f of ['state','loader','spreads','utils','deck','history','ui','app','journal','knowledge','academy'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),ctx);
const cards=JSON.parse(fs.readFileSync(path.join(root,'data/cards.json'))).cards;ctx.DeckLoader.fill(cards);ctx.DeckLoader.loaded=true;

ctx.addEventListener=()=>{};ctx.clearTimeout=()=>{};
ctx.fetch=async(url)=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url)))});
vm.runInContext(fs.readFileSync(path.join(root,'js/daily.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/book.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'js/author.js'),'utf8'),ctx);
(async()=>{
 const A=ctx.Author,workbook=JSON.parse(fs.readFileSync(path.join(root,'data/author-workbook.json')));
 const cardMap=new Map(cards.map(c=>[c.code,c]));
 const chapterIds=new Set(JSON.parse(fs.readFileSync(path.join(root,'data/book.json'))).chapters.map(c=>c.id));
 for(const [tab,count] of Object.entries({pairs:24,cases:8,courts:8})){
  assert.equal(workbook[tab].length,count);
  assert.equal(new Set(workbook[tab].map(c=>c.id)).size,count);
  assert.equal(new Set(workbook[tab].map(c=>c.title)).size,count);
  assert(workbook.guides[tab].length>100);
  for(const item of workbook[tab]){
   assert(/^[a-z0-9-]+$/.test(item.id));assert(chapterIds.has(item.chapter));
   assert(item.exercise.length>70,'A usable exercise: '+item.id);
   assert(item.question.endsWith('?'),'Open question: '+item.id);
  }
 }
 const seenPairs=new Set();
 for(const p of workbook.pairs){
  assert.equal(p.cards.length,2);assert.notEqual(...p.cards);
  assert(p.cards.every(c=>cardMap.has(c)));
  seenPairs.add([...p.cards].sort().join('|'));
  for(const key of ['context','reading','alternative','question','exercise'])assert(p[key].length>30);
 }
 assert.equal(seenPairs.size,24,'Distinct pairs, not reordered duplicates');
 assert.deepEqual(new Set(workbook.cases.map(c=>c.spread)),new Set(Object.keys(ctx.Spreads.types)));
 for(const c of workbook.cases){
  const spread=ctx.Spreads.types[c.spread];
  assert.equal(c.positions.length,spread.count,c.id);
  assert.deepEqual(c.positions.map(p=>p.label),Array.from(spread.labels),c.id+' matches live position order');
  assert.equal(new Set(c.positions.map(p=>p.card)).size,spread.count,c.id+' contains distinct cards');
  for(const p of c.positions){assert(cardMap.has(p.card));assert(p.reading.length>120);}
  for(const key of ['scenario','synthesis','alternative'])assert(c[key].length>180,c.id+' '+key);
  assert(c.question.length<=200,'Fits the editable manual question');
 }
 const roles=new Map();
 for(const c of workbook.courts){
  assert.equal(c.roles.length,4);
  for(const r of c.roles){assert(cardMap.has(r.card));assert(/\.(page|knight|queen|king)$/.test(r.card));assert(r.text.length>100);roles.set(r.card,(roles.get(r.card)||0)+1);}
  for(const key of ['core','example','misreading'])assert(c[key].length>200,c.id+' '+key);
 }
 assert.equal(roles.size,16);assert([...roles.values()].every(n=>n===2),'Every court card appears by rank and suit');
 // Loading the existing companion does not download the additional workbook.
 const calls=[];const fetchFile=ctx.fetch;
 ctx.fetch=async url=>{calls.push(url);return fetchFile(url);};
 const base=await A.load();assert.equal(calls.length,1);assert.equal(base.pairs,undefined);
 await Promise.all([A.load('pairs'),A.load('cases'),A.load('courts')]);
 assert.equal(calls.filter(x=>x==='data/author-workbook.json').length,1,'Concurrent tabs share one request');
 assert.equal(A.data,base);assert.equal(A.data.cards.length,78);assert.equal(A.data.lenormand.length,36);
 assert.equal(A.search('pairs','Шут').length,1);
 assert.equal(A.search('pairs','minor_arcana').length,0,'Search excludes identifiers');
 assert.equal(A.search('courts','Королева Мечей').length,2,'Search resolves nested role names');
 assert.equal(A.search('cases','Кельтский крест')[0].id,'celtic','Search includes spread name');
 assert(A.search('cases','согласующего').some(c=>c.id==='career'),'Search includes nested readings');
 assert.equal(A.search('pairs','небывалаястрока').length,0);
 get('bookContent').isConnected=true;
 const historyBefore=JSON.stringify(ctx.State.history);
 for(const tab of ['pairs','cases','courts']){
  await A.open(tab);assert(get('authorBody').innerHTML.includes('authorSearch'));
  for(const item of A.data[tab]){
   assert.equal(await A.open(tab,item.id),true);
   assert(ctx.location.hash.includes('study='+tab));
   assert(get('authorBody').innerHTML.includes(item.title));
   assert(get('authorBody').innerHTML.includes(item.exercise));
  }
 }
 assert.equal(JSON.stringify(ctx.State.history),historyBefore,'Reading never creates a session');
 await A.related('courts','minor_arcana.swords.queen');
 assert.equal(get('authorSearch').value,'Королева Мечей');assert.equal(get('authorCount').textContent,'Найдено: 2');
 await A.open('pairs',"' onclick='bad");assert(get('authorBody').innerHTML.includes('authorSearch'));assert(!ctx.location.hash.includes('onclick'));
 // Real comparison code receives the two selected cards; there is no generated reading.
 A.comparePair('1');assert.equal(get('compareA').value,'major_arcana.00');assert.equal(get('compareB').value,'major_arcana.01');
 assert(get('comparisonResult').innerHTML.includes('Шут'));assert(get('comparisonResult').innerHTML.includes('Маг'));
 // Cases open an empty manual form, carrying the question but not sample cards.
 get('manualSpread').value='daily';let note;const create=ctx.document.createElement;
 ctx.document.createElement=()=>{note=element();return note;};
 A.startCase('choice');assert.equal(get('manualSpread').value,'choice');
 assert.equal(get('manualQuestion').value,A.data.cases.find(c=>c.id==='choice').question);
 assert(get('manualPositions').innerHTML.includes('Путь Б: Результат'));
 assert.equal(get('manualCard0').value,'');assert(note.innerHTML.includes('Вернуться к разбору'));
 assert.equal(JSON.stringify(ctx.State.history),historyBefore);
 ctx.document.createElement=create;
 const spread=ctx.App.doSpread;let submitted;
 ctx.App.doSpread=(key,opts)=>{submitted={key,opts};};
 const choice=A.data.cases.find(c=>c.id==='choice');
 choice.positions.forEach((p,i)=>{get('manualCard'+i).value=p.card;});
 get('manualQuestion').value='Мой собственный вопрос';
 ctx.Journal.submitManual();assert.equal(submitted.key,'choice');assert.equal(submitted.opts.question,'Мой собственный вопрос');
 assert.equal(submitted.opts.manualCards.length,5);
 get('manualCard1').value=get('manualCard0').value;submitted=null;ctx.Journal.submitManual();assert.equal(submitted,null,'Duplicate cards remain rejected');
 ctx.App.doSpread=spread;
 // Court exercises carry the user-selected role to the existing autosaved diary.
 let preset;const practice=ctx.Book.practice;ctx.Book.practice=(id,p)=>{preset=p;};
 A.startCourt('queens','minor_arcana.swords.queen');
 assert.equal(preset.card,'minor_arcana.swords.queen');assert.equal(preset.chapter,'13');
 assert.equal(preset.exercise.steps[0],A.data.courts.find(c=>c.id==='queens').exercise);
 preset=null;A.startCourt('queens','major_arcana.00');assert.equal(preset,null);
 ctx.Book.practice=practice;
 // A workbook failure preserves the requested detail and leaves base material usable.
 delete A.data.pairs;delete A.data.cases;delete A.data.courts;
 let attempts=0;ctx.fetch=async url=>{attempts++;return attempts===1?{ok:false}:fetchFile(url);};
 assert.equal(await A.open('cases','celtic'),false);assert.equal(A.workbookPending,null);
 assert(get('bookContent').innerHTML.includes('Author.retryOpen()'));
 await A.load('cards');assert.equal(attempts,1);
 assert.equal(await A.retryOpen(),true);assert.equal(A.tab,'cases');
 assert(get('authorBody').innerHTML.includes('Подготовить первую открытую встречу'));
 // An older pending tab cannot overwrite a newer successful navigation.
 delete A.data.pairs;delete A.data.cases;delete A.data.courts;
 let release;ctx.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>workbook});});
 const pending=A.open('pairs','1');
 await A.open('lessons','13');release();assert.equal(await pending,false);assert.equal(A.tab,'lessons');
 // Text from all new renderers is escaped, including nested position/role prose.
 const pair=A.data.pairs[0],original=pair.reading;pair.reading='<img src=x onerror=alert(1)>';
 await A.open('pairs',pair.id);assert(get('authorBody').innerHTML.includes('&lt;img'));assert(!get('authorBody').innerHTML.includes('<img src=x'));
 pair.reading=original;
 const c=A.data.cases[0],old=c.positions[0].reading;c.positions[0].reading='<script>alert(1)</script>';
 await A.open('cases',c.id);assert(!get('authorBody').innerHTML.includes('<script>'));assert(get('authorBody').innerHTML.includes('&lt;script&gt;'));c.positions[0].reading=old;
 console.log('PASS: 24 pairs, all 8 live spread schemas, all 16 courts; lazy load/coalescing/retry/races; nested search; all 40 detail routes; comparison/manual handoff; selected-card practice; no sample history; escaping');
})().catch(e=>{console.error(e);process.exit(1);});
