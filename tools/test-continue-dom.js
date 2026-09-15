// Navigation, theme, personal question and existing reading surfaces in a real DOM.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole,ResourceLoader}=require('jsdom');
const root=path.resolve(__dirname,'..');
class LocalResources extends ResourceLoader{
 fetch(url){const u=new URL(url);if(u.hostname!=='polkas.test')return null;const file=path.resolve(root,'.'+u.pathname);return file.startsWith(root+path.sep)&&fs.existsSync(file)?Promise.resolve(fs.readFileSync(file)):null;}
}
async function until(test){for(let i=0;i<120;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}throw Error('Page did not reach the expected state');}
(async()=>{
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=await JSDOM.fromFile(path.join(root,'index.html'),{url:'https://polkas.test/',virtualConsole:vc,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,String(url))))});
  w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.alert=m=>errors.push('alert: '+m);w.confirm=()=>true;
 }});
 const w=dom.window,$=s=>w.document.querySelector(s),all=s=>Array.from(w.document.querySelectorAll(s));
 try {
  await until(()=>w.DeckLoader?.loaded&&$('#continueWork'));
  assert($('#continueWork').hidden,'new visitors have no fabricated progress');
  w.App.doSpread('threecards',{question:'Как двигаться дальше?'});
  const source=w.State.history[0],code=source.cards[0].cardId,ids=JSON.stringify(source.cards);
  $('#readingNotes').value='Исходная мысль';w.Journal.draft();
  await w.ContinuePractice.start(code);assert($('#mirrorCard'));assert.equal(w.Book.practiceSource,source.id);
  assert.equal(w.State.history.length,1,'opening exercise does not create empty records');
  assert.equal($('#mirror-question').value,source.question);
  $('#mirror-notes').value='Новая ассоциация';w.Book.savePractice();
  const practice=w.State.history[0];assert.equal(practice.sourceReadingId,source.id);
  assert(w.Journal.validate(JSON.parse(JSON.stringify(practice))));
  $('.continue-source button').click();assert.equal(w.Journal.currentId,source.id);
  assert.equal(JSON.stringify(w.State.history.find(x=>x.id===source.id).cards),ids);
  assert.equal($('#readingNotes').value,'Исходная мысль');assert($('.continue-related button'));
  await w.ContinuePractice.start(code);assert.equal(w.Book.practiceId,practice.id);
  assert.equal($('#mirror-notes').value,'Новая ассоциация');w.Book.savePractice();assert.equal(w.State.history.length,2);
  w.Book.practice();assert.equal(w.Book.practiceSource,null);assert(!$('.continue-source'));
  await w.Book.open('13',2);await w.Author.open('lessons','1');w.App.showHome();
  assert(!$('#continueWork').hidden);assert.equal(all('.continue-card').length,3);assert.equal(all('#continueWork').length,1);
  $('.continue-card').click();assert.equal(w.Journal.currentId,source.id);
  w.App.showHome();w.App.showHome();assert.equal(all('#continueWork').length,1);
  const bad={...practice,sourceReadingId:{bad:true}};assert(!w.Journal.validate(bad));
  const savedPractice=JSON.parse(JSON.stringify(practice));w.State.history=[savedPractice];w.Book.practice(savedPractice.id);
  assert($('.continue-source').textContent.includes('нет в этом дневнике'));assert(!$('.continue-source button'));
  w.State.history=[source];w.Journal.open(0);
  const load=w.Author.load;let resolve;w.Author.load=()=>new Promise(r=>{resolve=r;});
  const pending=w.ContinuePractice.start(code);w.App.showHome();resolve();await pending;
  assert(!$('#mirrorCard'),'slow fetch cannot hijack navigation');w.Author.load=load;
  assert.deepEqual(errors,[]);
  console.log('PASS CONTINUE: empty state, stable reading IDs, practice reuse, source links, orphan imports, home resumption and stale request protection');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exit(1);});
