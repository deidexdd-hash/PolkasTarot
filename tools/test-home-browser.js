// Actual Chromium and WebKit layout checks. Starts and closes its own local server.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.HOME_SHOTS_DIR||path.join(root,'screenshots/home');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,...(name==='webkit'?{isMobile:true,hasTouch:true}:{})});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const fits=async label=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' '+label+' horizontal overflow');
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:width<700?844:1000});await page.goto(url);await page.waitForFunction(()=>DeckLoader.loaded);
    await page.evaluate(()=>{document.querySelectorAll('img').forEach(img=>{img.loading='eager';});});
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('main img')).every(img=>img.complete&&img.naturalWidth>0));
    await fits('home '+width);
    assert(await page.locator('#homeStartReading').isVisible());assert(await page.locator('#questionInput').isVisible());
    assert(await page.locator('#homeStartReading').evaluate(el=>el.getBoundingClientRect().height>=44));
    assert.equal(await page.locator('#questionInput').evaluate(el=>getComputedStyle(el).fontSize),'16px');
    if(width<700){
     assert(await page.locator('#homeMenuToggle').isVisible());
     assert(await page.locator('.mobile-dock').isVisible());
     for(const button of await page.locator('.mobile-dock button').all())assert(await button.evaluate(el=>el.getBoundingClientRect().height>=44));
    }
    if([390,1440].includes(width)){
     await page.screenshot({path:path.join(out,`${name}-${width}-full.png`),fullPage:true});
     await page.screenshot({path:path.join(out,`${name}-${width}-hero.png`)});
    }
   }
   await page.setViewportSize({width:390,height:844});
   await page.locator('#homeMenuToggle').click();assert(await page.locator('#homeMenu').isVisible());await fits('menu');
   await page.keyboard.press('Escape');assert(await page.locator('#homeMenu').isHidden());
   await page.locator('#homeMenuToggle').click();await page.locator('#homeMenu').getByRole('button',{name:'Карта как зеркало · книга',exact:false}).click();
   await page.waitForSelector('#bookContents .book-row');await fits('book');assert(await page.locator('.book-actions .primary-button').isVisible());
   await page.locator('.brand').click();await page.locator('#questionInput').fill('Что поможет сделать первый шаг?');await page.locator('#homeStartReading').click();
   await page.waitForSelector('.card-item');assert.equal(await page.locator('.card-item').count(),3);await fits('reading');
   assert.equal(await page.evaluate(()=>State.history[0].question),'Что поможет сделать первый шаг?');assert(await page.locator('.home-hero-visual').isHidden());
   await page.locator('.brand').click();await page.locator('.layout-catalog-entry').click();await page.waitForSelector('.layout-tile');await fits('catalog');
   assert.equal(await page.locator('.layout-tile').count(),20);assert.deepEqual(errors,[]);
   console.log('PASS '+name+': 320/390/768/1440, all images, readable input, touch controls, mobile menu, book, question, reading and catalog');
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
