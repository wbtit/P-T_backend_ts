import path from "path";

export function isStandaloneStandardImage(storagePath: string): boolean {
  const ext = path.extname(storagePath).toLowerCase();
  return ext === ".png" || ext === ".jpg" || ext === ".jpeg";
}
