// Real DOM and click/input handlers; jsdom does not verify browser layout.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const root=path.resolve(__dirname,'..');
class LocalResources extends ResourceLoader{
 fetch(url){
  const u=new URL(url);if(u.hostname!=='polkas.test')return null;
  const file=path.resolve(root,'.'+u.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return null;
  return Promise.resolve(fs.readFileSync(file));
 }
}
async function until(test){for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out waiting for the page');}
(async()=>{
 const errors=[],requests=[],storage=new Map(),vc=new VirtualConsole();
 vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(root,'index.html'),{
  url:'https://polkas.test/#study=cases&id=choice',virtualConsole:vc,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){
   w.fetch=async url=>{requests.push(String(url));return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url))))};};
   Object.defineProperty(w,'localStorage',{value:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))}});
   w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;
  }
 });
 const w=dom.window,$=s=>w.document.querySelector(s),all=s=>Array.from(w.document.querySelectorAll(s));
 try{
  await until(()=>w.DeckLoader?.loaded&&$('.author-title')?.textContent==='Два способа учиться');
  assert.equal(w.Author.tab,'cases');assert.equal(all('.author-tabs button').length,7);
  assert.equal(requests.filter(x=>x==='data/author-workbook.json').length,1);
  assert.equal(w.State.history.length,0,'Opening a deep link does not create a reading');
  for(const tab of ['pairs','cases','courts'])for(const item of w.Author.data[tab]){
   await w.Author.open(tab,item.id);
   assert.equal($('.author-title').textContent,item.title);
   assert.equal(all('.author-card-link').length,tab==='pairs'?2:tab==='cases'?item.positions.length:4);
   for(const img of all('.author-card-link img'))assert(fs.existsSync(path.join(root,img.getAttribute('src'))));
  }
  await w.Author.open('pairs','1');$('[onclick^="Author.comparePair"]').click();
  assert.equal($('#compareA').value,'major_arcana.00');assert.equal($('#compareB').value,'major_arcana.01');
  assert.equal(all('.comparison-grid article').length,2);assert.equal(w.State.history.length,0);
  await w.Author.open('cases','choice');assert.notEqual(w.getComputedStyle($('.book-actions .primary-button')).display,'none');
  $('[onclick^="Author.startCase"]').click();
  assert.equal($('#manualSpread').value,'choice');assert.equal(all('#manualPositions fieldset').length,5);
  assert(all('#manualPositions select').every(s=>s.value===''),'Example cards are not preselected');
  assert.equal($('#manualQuestion').value,w.Author.data.cases.find(c=>c.id==='choice').question);
  assert.notEqual(w.getComputedStyle($('.manual-form .primary-button')).display,'none','Manual submit must remain visible in reading mode');
  $('#manualQuestion').value='Мой вопрос <img src=x onerror=alert(1)>';
  const example=w.Author.data.cases.find(c=>c.id==='choice');
  example.positions.forEach((p,i)=>{$('#manualCard'+i).value=p.card;});$('#manualReverse0').checked=true;
  $('.manual-form .primary-button').click();
  assert.equal(w.State.history.length,1);assert.equal(w.State.history[0].spreadKey,'choice');
  assert.equal(w.State.history[0].question,'Мой вопрос <img src=x onerror=alert(1)>');
  assert.equal(w.State.history[0].cards[0].orientation,'reversed');assert(w.Journal.validate(w.State.history[0]));
  assert.equal(all('img[src="x"]').length,0,'Question is escaped in the rendered reading');
  await w.Author.open('courts','queens');
  all('[onclick^="Author.startCourt"]').find(b=>b.getAttribute('onclick').includes('minor_arcana.swords.queen')).click();
  assert.equal($('#mirrorCard').value,'minor_arcana.swords.queen');assert.equal(w.State.history.length,1);
  assert($('.author-practice-guide').textContent.includes('Выбери одну ситуацию помощи'));
  $('#mirror-notes').value='Уточню запрос, затем обозначу доступное время.';$('#mirror-notes').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.State.history.length,2);assert(w.Journal.validate(w.State.history[0]));
  assert.equal(w.State.history[0].cards[0].cardId,'minor_arcana.swords.queen');
  w.Journal.open(0);assert.equal($('#mirror-notes').value,'Уточню запрос, затем обозначу доступное время.');assert($('.author-practice-guide'));
  await w.Author.open('cards','minor_arcana.swords.queen');
  const related=all('[onclick^="Author.related"]').find(b=>b.getAttribute('onclick').includes("'courts'"));
  assert(related,$('#bookContent').textContent);related.click();
  await until(()=>$('#authorSearch')?.value==='Королева Мечей');assert.equal(all('#authorResults .book-row').length,2);
  $('#authorSearch').value='несуществующее';$('#authorSearch').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(all('#authorResults .book-row').length,0);assert($('#authorResults').textContent.includes('Совпадений нет'));
  assert.deepEqual(errors,[]);
  console.log('PASS DOM: all 40 details and local images; direct route; pair comparison; empty manual schema and editable question; visible submit; orientation and escaping; selected court exercise autosave/reopen; related search');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exit(1);});
