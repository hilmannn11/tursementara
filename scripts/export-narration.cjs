// Run after editing narrated content, then run generate-narration.py.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '#about', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    const passages = await page.evaluate(async () => {
      const { collect, passageKey, objectOptions } = window.LitheraNarrationContent;
      const output = {};
      const add = (record) => {
        const queue = collect(record);
        const text = queue.map(chunk => chunk.text).join(' ');
        if (!text) return;
        const key = passageKey(text);
        if (output[key] && output[key].text !== text) throw Error('Narration key collision');
        output[key] = { text, chunks: queue.map(chunk => chunk.text) };
      };
      add({ root: document.querySelector('#aboutPage .about-page-inner'), selector: 'h1, p' });
      add({ root: document.querySelector('#siteChooser .site-chooser-inner'), selector: 'h2, .site-chooser-description' });
      document.querySelectorAll('.research-entry').forEach(root => add({ root, selector: 'h4, p', glossary: true }));
      for (const model of ['first', 'second', 'plaque']) {
        if (model === 'plaque') openPlaquePhoto();
        else openArchive('titik-2', model);
        await new Promise(resolve => setTimeout(resolve, 100));
        add({ root: document.querySelector('#archiveModalContent'), ...objectOptions });
        document.querySelector('#archiveModal').close();
      }
      const paragraph = document.createElement('p');
      document.body.append(paragraph);
      const feedback = text => { paragraph.textContent = text; add({ root: paragraph }); };
      feedback('Kamu bisa membaca lagi penjelasannya, lalu kembali ke soal ini.');
      for (const question of lessonQuestions) {
        const correct = `Benar, jawaban ${String.fromCharCode(65 + question.answer)}. ${question.explanation}`;
        feedback(correct);
        feedback(correct + ' Soal ini sudah tercatat; progres tidak bertambah.');
        for (const room of rooms.filter(room => room.badge)) feedback(correct + ` Badge “${room.badge}” terbuka!`);
        feedback(`Belum tepat. ${question.hint}`);
        feedback(`Belum tepat. ${question.hint} Kamu bisa membaca ulang penjelasannya, lalu kembali ke soal ini.`);
      }
      paragraph.remove();
      return output;
    });
    fs.writeFileSync(path.join(__dirname, 'narration-passages.json'), JSON.stringify(passages, null, 2) + '\n');
    console.log(`Exported ${Object.keys(passages).length} narrated passages, including all quiz feedback variants.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
