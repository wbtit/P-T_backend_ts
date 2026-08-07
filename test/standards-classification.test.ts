import { classifyPageText } from "../src/modules/standards/services/classificationService";
import { StandardChunkType } from "@prisma/client";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";

describe("Phase 3: Page Classification Heuristic (Golden Set)", () => {
  let golden: any = {};

  beforeAll(async () => {
    const pdfPath = path.resolve(__dirname, "fixtures/marvin-metals-standards.pdf");
    if (!fs.existsSync(pdfPath)) {
      throw new Error("Fixture not found");
    }
    
    const buffer = fs.readFileSync(pdfPath);
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
    
    golden = {
      page2_prose: pages[1],
      page5_prose: pages[4],
      page6_prose: pages[5],
      page8_visual: pages[7],
      page11_visual: pages[10],
      page19_visual_glossary: pages[18],
      page20_visual_glossary: pages[19],
    };
  });

  describe("PROSE pages (high char count, high words per line)", () => {
    it("should classify page 2 (General Standards) as PROSE", () => {
      expect(classifyPageText(golden.page2_prose)).toBe(StandardChunkType.PROSE);
    });

    it("should classify page 5 (Various Items) as PROSE", () => {
      expect(classifyPageText(golden.page5_prose)).toBe(StandardChunkType.PROSE);
    });

    it("should classify page 6 (Prose specs) as PROSE", () => {
      expect(classifyPageText(golden.page6_prose)).toBe(StandardChunkType.PROSE);
    });
  });

  describe("VISUAL pages (drawings, tables, low words per line or low char count)", () => {
    it("should classify page 8 (Standard Clip Angles drawing) as VISUAL", () => {
      expect(classifyPageText(golden.page8_visual)).toBe(StandardChunkType.VISUAL);
    });

    it("should classify page 11 (Sparse visual details) as VISUAL", () => {
      expect(classifyPageText(golden.page11_visual)).toBe(StandardChunkType.VISUAL);
    });
  });

  describe("VISUAL edge cases (Glossaries and Legends)", () => {
    it("should classify page 19 (Typical Detailing Abbreviations) as VISUAL (accepted tradeoff)", () => {
      expect(classifyPageText(golden.page19_visual_glossary)).toBe(StandardChunkType.VISUAL);
    });

    it("should classify page 20 (Additional Abbreviations/Legend) as VISUAL (accepted tradeoff)", () => {
      expect(classifyPageText(golden.page20_visual_glossary)).toBe(StandardChunkType.VISUAL);
    });
  });
});
