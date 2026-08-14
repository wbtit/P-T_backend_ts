import fs from 'fs';
import pdfParse from 'pdf-parse';

async function extractTextPerPage(buffer: Buffer): Promise<string[]> {
  const pages: string[] = [];
  const options = {
    pagerender: async function(pageData: any) {
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });
      let lastY, text = '';
      for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY){
              text += item.str;
          } else {
              text += '\n' + item.str;
          }
          lastY = item.transform[5];
      }
      pages.push(text);
      return text;
    }
  };
  await pdfParse(buffer, options);
  return pages;
}

async function run() {
  console.log("Reading PDF...");
  const buffer = fs.readFileSync("/home/wbtserver/P-T_backend_ts/test/fixtures/ACI-318-14.pdf");
  console.log("Extracting text per page...");
  const pages = await extractTextPerPage(buffer);
  
  console.log(`\nTotal page count: ${pages.length}`);
  
  const lengths = pages.map(p => p.length).sort((a, b) => a - b);
  const max = lengths[lengths.length - 1];
  const median = lengths[Math.floor(lengths.length / 2)];
  const p95 = lengths[Math.floor(lengths.length * 0.95)];
  
  console.log(`Max length: ${max}`);
  console.log(`Median length: ${median}`);
  console.log(`95th percentile length: ${p95}`);
  
  const over7k = lengths.filter(l => l > 7000).length;
  console.log(`Pages > 7000 characters: ${over7k}`);
}

run().catch(console.error);
