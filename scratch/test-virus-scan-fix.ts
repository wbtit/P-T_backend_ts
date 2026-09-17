import { scanFile } from "../src/utils/virusScan.util";
import path from "path";

(async () => {
  const testFile = path.join(process.cwd(), "benchmark-source/Joist & Hilti/JOIST/JoistTopChordWidth.pdf");
  const result = await scanFile(testFile);
  console.log("scanFile() result:", JSON.stringify(result, null, 2));
  console.log("Would be rejected as infected?", !result.isClean);
})();
