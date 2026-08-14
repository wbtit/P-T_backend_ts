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
  const pages = await extractTextPerPage(buffer);
  
  console.log("--- PAGE 1 ---");
  console.log(pages[0]);
  console.log("--- PAGE 2 ---");
  console.log(pages[1]);
  console.log("--- PAGE 3 ---");
  console.log(pages[2]);
}

run().catch(console.error);
