// Every interior uses the shared design without replacing its data or actions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const root=path.resolve(__dirname,'..');
class LocalResources extends ResourceLoader {
 fetch(url){const u=new URL(url);if(u.hostname!=='polkas.test')return null;const file=path.resolve(root,'.'+u.pathname);return file.startsWith(root+path.sep)&&fs.existsSync(file)?Promise.resolve(fs.readFileSync(file)):null;}
}
async function until(test){for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Expected view did not load');}
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(root,'index.html'),{url:'https://polkas.test/',virtualConsole:vc,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url))))});
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;
 }});
 const w=dom.window,$=s=>w.document.querySelector(s),all=s=>Array.from(w.document.querySelectorAll(s));
 const design=key=>{
  assert.equal(w.document.body.dataset.page,key);assert.equal($('meta[name="theme-color"]').content,'#f5f1e8');
  assert.equal(w.getComputedStyle(w.document.body).getPropertyValue('--bg').trim(),'#f5f1e8');
  const hero=$(key==='journal'?'.editorial-journal-hero .editorial-hero':'#spread-container .editorial-hero');assert(hero,key+' hero');
  const img=hero.querySelector('.editorial-photo');assert(img?.alt);assert(img.getAttribute('srcset'));assert(fs.existsSync(path.join(root,img.getAttribute('src'))));
  assert.equal(w.getComputedStyle($('.reading-studio')).display,'none');
  const toolbar=$('.practice-toolbar');assert.equal(w.getComputedStyle(toolbar).display,'none');
 };
 try {
  await until(()=>w.DeckLoader?.loaded&&w.Editorial);
  w.Academy.home();design('study');assert.equal(all('.editorial-tile-photo img').length,8);
  w.Academy.train();design('train');assert.notEqual(w.getComputedStyle($('#showTrainingAnswer')).display,'none');
  $('#trainingThought').value='Моё наблюдение';$('#showTrainingAnswer').click();assert($('#trainingAnswer').textContent.includes('Как вам далось'));
  w.Academy.compare();design('compare');assert.equal(all('.comparison-grid article').length,2);
  w.Academy.stats();design('stats');
  w.App.showDeck();design('deck');assert.equal(all('.atlas-card').length,78);
  $('.atlas-card').click();assert($('#cardModal').classList.contains('active'));assert.equal(w.getComputedStyle(w.document.body).getPropertyValue('--sheet-bg').trim(),'#faf7f0');w.UI.closeCard();
  await w.Book.open();design('book');assert($('#bookContents .book-row'));
  w.Book.chapter('13');design('book');assert($('.book-prose'));w.Book.resize('22');assert.equal($('.book-prose').style.getPropertyValue('--book-size'),'22px');
  for(const tab of ['cards','lessons','pairs','courts','cases','practices','lenormand']){
   await w.Author.open(tab);design('author');assert($('#authorResults .book-row'));
   if(tab!=='lenormand')assert($('#authorResults .editorial-row-thumbs img'),tab+' thumbnails');
  }
  await w.SpreadLibrary.open();design('layouts');assert.equal(all('.editorial-scheme').length,20);
  await w.SpreadLibrary.open('celtic');design('layouts');assert($('#layoutDraw'));
  assert.equal(w.State.history.length,0,'Browsing and photography do not create readings');
  w.Journal.showManual();design('manual');assert.notEqual(w.getComputedStyle($('.manual-form .primary-button')).display,'none');
  w.App.doSpread('threecards',{question:'Мой вопрос <img src=x onerror=alert(1)>'});design('reading');assert.equal(all('.card-item').length,3);assert.equal(all('img[src="x"]').length,0);
  $('#readingNotes').value='Сохранённая мысль';$('#readingNotes').dispatchEvent(new w.Event('input',{bubbles:true}));
  const id=w.State.history[0].id;
  w.Daily.journal();design('journal');assert.equal(w.document.activeElement,$('#history-sidebar'));assert($('.editorial-journal-card'));
  assert.equal(w.getComputedStyle($('#history-sidebar')).display,'block');assert.equal(w.getComputedStyle($('#spread-container')).display,'none');
  $('#historyList button').click();design('reading');assert.equal($('#readingNotes').value,'Сохранённая мысль');assert.equal(w.State.history[0].id,id);
  w.Daily.open();design('daily');const count=w.State.history.length;
  w.Daily.journal();w.Daily.open();design('daily');assert.equal(w.State.history.length,count);
  w.Book.practice();design('mirror');$('#mirror-notes').value='Мой отклик';$('#mirror-notes').dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.State.history[0].notes,'Мой отклик');assert(w.State.history[0].bookPractice);
  w.App.showHome();assert.equal(w.document.body.dataset.page,'home');assert.equal(w.getComputedStyle($('.editorial-journal-hero')).display,'none');
  assert.deepEqual(errors,[]);
  console.log('PASS EDITORIAL DOM: all interiors share the light theme, photographs and working controls; study, notes, journal reopening and daily reuse are preserved');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exit(1);});
