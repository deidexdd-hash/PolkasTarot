// Regression: API URLs must remain intact; every card must respect --width.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { Jimp } = require('jimp');
(async () => {
  const buffers = new Map();
  for (const width of [640, 960]) {
    buffers.set(width, await new Jimp({ width, height: 1000, color: 0xcfa455ff }).getBuffer('image/jpeg'));
  }
  for (const mode of ['small', 'large', 'mixed']) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tarot-images-'));
    let rejected = 0;
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api') {
        const titles = url.searchParams.get('titles').split('|');
        const pages = titles.map(title => {
          const width = mode === 'large' || (mode === 'mixed' && title.includes('Magician')) ? 960 : 640;
          return { title, imageinfo: [{
            thumburl: `http://127.0.0.1:${server.address().port}/image/${width}?issued=yes&token=a%2Fb`,
            extmetadata: { LicenseShortName: { value: 'Public domain' }, Artist: { value: 'Fixture' } }
          }] };
        });
        res.end(JSON.stringify({ query: { pages } }));
      } else if (url.search === '?issued=yes&token=a%2Fb' && buffers.has(Number(url.pathname.split('/').pop()))) {
        res.end(buffers.get(Number(url.pathname.split('/').pop())));
      } else { rejected++; res.writeHead(400); res.end(); }
    });
    try {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      fs.mkdirSync(path.join(root, 'tools'));
      fs.mkdirSync(path.join(root, 'data'));
      fs.mkdirSync(path.join(root, 'img/cards'), { recursive: true });
      fs.copyFileSync(path.join(__dirname, 'fetch-images.js'), path.join(root, 'tools/fetch-images.js'));
      fs.copyFileSync(path.join(__dirname, '../data/cards.json'), path.join(root, 'data/cards.json'));
      const child = spawn(process.execPath, [path.join(root, 'tools/fetch-images.js')], {
        env: { ...process.env, COMMONS_API: `http://127.0.0.1:${server.address().port}/api`, NODE_PATH: path.join(__dirname, 'node_modules') }
      });
      let output = '';
      child.stdout.on('data', b => { output += b; });
      child.stderr.on('data', b => { output += b; });
      const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
      assert.equal(code, 0, output);
      assert.equal(rejected, 0, 'Downloader changed an API URL');
      const files = fs.readdirSync(path.join(root, 'img/cards'));
      assert.equal(files.length, 78);
      for (const file of files) {
        const img = await Jimp.read(path.join(root, 'img/cards', file));
        assert.ok(img.bitmap.width <= 720, `${mode}: ${file} exceeds width limit`);
      }
      console.log(`PASS ${mode}: 78 images, intact URLs, width <= 720`);
    } finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
