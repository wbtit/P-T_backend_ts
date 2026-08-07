import { StandardChunkType } from "@prisma/client";

export function classifyPageText(textContent: string): StandardChunkType {
  const text = textContent.trim();
  
  // 1. Empty text is visual (pure drawing)
  if (text.length === 0) {
    return StandardChunkType.VISUAL;
  }
  
  // 2. Low character count is visual (sparse drawing labels)
  if (text.length < 400) {
    return StandardChunkType.VISUAL;
  }
  
  // 3. Line density check
  const lines = text.split("\n").filter(l => l.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  
  const wordsPerLine = lines.length > 0 ? words.length / lines.length : 0;
  
  // If words per line is low, it's sparse text (table, drawing, legend/glossary)
  if (wordsPerLine < 4.5) {
    return StandardChunkType.VISUAL;
  }
  
  // Otherwise, prose
  return StandardChunkType.PROSE;
}
