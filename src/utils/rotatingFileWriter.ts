import fs from "fs";
import path from "path";

type RotatingFileWriterOptions = {
  filePath: string;
  maxBytes?: number;
  maxFiles?: number;
};

const DEFAULT_MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const DEFAULT_MAX_FILES = 5;

export class RotatingFileWriter {
  private readonly filePath: string;
  private readonly maxBytes: number;
  private readonly maxFiles: number;
  private stream: fs.WriteStream;
  private currentSize: number;

  constructor(options: RotatingFileWriterOptions) {
    this.filePath = options.filePath;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;

    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    this.currentSize = fs.existsSync(this.filePath) ? fs.statSync(this.filePath).size : 0;
    this.stream = fs.createWriteStream(this.filePath, { flags: "a" });
  }

  write(line: string) {
    try {
      const bytes = Buffer.byteLength(line);
      if (this.currentSize + bytes > this.maxBytes) {
        this.rotate();
      }

      this.stream.write(line);
      this.currentSize += bytes;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `[${new Date().toISOString()}] rotating writer error (${this.filePath}): ${message}\n`
      );
    }
  }

  private rotate() {
    this.stream.end();

    const oldestFile = `${this.filePath}.${this.maxFiles}`;
    if (fs.existsSync(oldestFile)) {
      fs.unlinkSync(oldestFile);
    }

    for (let i = this.maxFiles - 1; i >= 1; i -= 1) {
      const source = `${this.filePath}.${i}`;
      const target = `${this.filePath}.${i + 1}`;
      if (fs.existsSync(source)) {
        fs.renameSync(source, target);
      }
    }

    if (fs.existsSync(this.filePath)) {
      fs.renameSync(this.filePath, `${this.filePath}.1`);
    }

    this.stream = fs.createWriteStream(this.filePath, { flags: "w" });
    this.currentSize = 0;
  }
}

export function getRotateConfig() {
  const maxBytes = Number(process.env.LOG_ROTATE_MAX_BYTES);
  const maxFiles = Number(process.env.LOG_ROTATE_MAX_FILES);

  return {
    maxBytes: Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : DEFAULT_MAX_BYTES,
    maxFiles: Number.isFinite(maxFiles) && maxFiles > 0 ? Math.floor(maxFiles) : DEFAULT_MAX_FILES,
  };
}
