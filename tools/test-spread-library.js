// Content-to-runtime contract. DOM interactions are covered by the companion test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/spread-library.json')));
const cards=new Map(JSON.parse(fs.readFileSync(path.join(root,'data/cards.json'))).cards.map(c=>[c.code,c]));
const ctx={console,URL,UI:{renderSpread(){},escape:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
ctx.window=ctx;vm.createContext(ctx);
for(const file of ['spreads','spread-library'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),ctx);
const lib=ctx.SpreadLibrary;lib.data=data;
assert.equal(data.items.length,20);assert.equal(data.items.filter(s=>s.added).length,12);
assert.deepEqual(new Set(data.items.map(s=>s.key)),new Set(Object.keys(ctx.Spreads.types)));
assert.equal(data.items.reduce((n,s)=>n+s.positions.length,0),116);
const sourceIds=new Set(data.sources.map(s=>s.id));assert.equal(sourceIds.size,16);
assert.equal(new Set(data.sources.map(s=>s.language)).size,9);assert.equal(data.research.searchedLanguages.length,15);
for(const source of data.sources){assert.equal(new URL(source.url).protocol,'https:');assert(source.note);assert(source.title);}
for(const s of data.items){
 const config=ctx.Spreads.types[s.key];
 assert.equal(s.title,config.title,s.key);assert.equal(s.positions.length,config.count,s.key);
 assert.deepEqual(s.positions.map(p=>p.label),Array.from(config.labels),s.key+' position order');
 assert.equal(new Set(s.positions.map(p=>p.example.card)).size,s.positions.length,s.key+' distinct example cards');
 assert(s.category in lib.categories);assert(s.level in lib.levels);
 assert(s.sources.length&&s.sources.every(id=>sourceIds.has(id)),s.key+' traceable sources');
 for(const field of ['intro','when','origin'])assert(s[field].trim());
 for(const field of ['questions','reading','pitfalls','journal'])assert(s[field].length>=3&&s[field].every(t=>t.trim()));
 assert(s.questions.every(q=>q.length<=200),'Questions fit the editable form');
 for(const field of ['scenario','synthesis','alternative'])assert(s.example[field].trim());
 const areas=config.areas.map(row=>row.replace(/["']/g,'').trim().split(/\s+/));
 s.positions.forEach((p,i)=>{
  assert.equal(areas[p.row-1][p.col-1],'p'+(i+1),s.key+' diagram matches live layout');
  assert(p.meaning&&p.question&&p.example.reading);
  const card=cards.get(p.example.card);assert(card);assert.equal(card.name,p.example.name);assert.equal(card.img,p.example.img);
  assert(fs.existsSync(path.join(root,p.example.img)),s.key+' local card image');
 });
 assert.equal((lib.diagram(s).match(/<rect /g)||[]).length,s.positions.length);
}
assert.equal(lib.search('новолуние','all',12,false).length,1);
assert.equal(lib.search('','all',12,true).length,12);
assert.equal(lib.search('','cycles',7,true).length,4);
assert.equal(lib.search('','all',3,false).length,4);
assert.equal(lib.search('несуществующее','all',12,false).length,0);
assert(!lib.known('__proto__'));assert(!lib.known("' onclick='bad"));
assert(lib.diagram({...data.items[0],title:'<img src=x>'}).includes('&lt;img'));
const sources=lib.data.sources;
lib.data.sources=[{id:'bad',title:'bad',url:'javascript:alert(1)'},{id:'good',title:'<img src=x>',url:'https://example.com',publisher:'<b>',note:'<script>',language:'ru'}];
assert(!lib.sourceMarkup().includes('javascript:'));assert(lib.sourceMarkup().includes('&lt;script&gt;'));
lib.data.sources=sources;
(async()=>{
 lib.data=null;let calls=0,resolve;
 ctx.fetch=()=>{calls++;return new Promise(r=>{resolve=r;});};
 const a=lib.load(),b=lib.load();assert.equal(calls,1);
 resolve({ok:true,json:async()=>data});assert.equal(await a,await b);assert.equal(lib.pending,null);
 lib.data=null;ctx.fetch=async()=>({ok:false});await assert.rejects(lib.load());assert.equal(lib.pending,null);
 ctx.fetch=async()=>({ok:true,json:async()=>data});assert.equal((await lib.load()).items.length,20);
 console.log('PASS: 20 guides / 12 additions / 116 positions; live geometry, labels and local examples; 16 sources / 9 languages; filters; safe links and titles; shared lazy request and retry');
})().catch(e=>{console.error(e);process.exitCode=1;});
