import fs from "node:fs/promises";
import path from "node:path";

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type ProjectStorageOptions = {
  dir: string;
  filename?: string;
};

export class ProjectStorage {
  private dir: string;
  private filename: string;

  constructor(opts: ProjectStorageOptions) {
    this.dir = opts.dir;
    this.filename = opts.filename ?? "project.json";
  }

  filePath(): string {
    return path.join(this.dir, this.filename);
  }

  backupPath(): string {
    return path.join(this.dir, `${this.filename}.bak`);
  }

  async load<T>(fallback: () => T): Promise<T> {
    await fs.mkdir(this.dir, { recursive: true });

    const target = this.filePath();
    const backup = this.backupPath();

    const readJson = async (p: string): Promise<T | null> => {
      try {
        const raw = await fs.readFile(p, "utf8");
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    };

    const fromTarget = await readJson(target);
    if (fromTarget) return fromTarget;

    const fromBackup = await readJson(backup);
    if (fromBackup) {
      await this.save(fromBackup);
      return fromBackup;
    }

    const doc = fallback();
    await this.save(doc);
    return doc;
  }

  async save<T>(doc: T): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });

    const target = this.filePath();
    const backup = this.backupPath();
    const tmp = path.join(this.dir, `${this.filename}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`);

    const json = JSON.stringify(doc, null, 2);
    await fs.writeFile(tmp, `${json}\n`, "utf8");

    try {
      try {
        await fs.rm(backup, { force: true });
      } catch {
        // ignore
      }

      try {
        await fs.rename(target, backup);
      } catch {
        // ignore (no target or rename fail)
      }

      try {
        await fs.rename(tmp, target);
      } catch {
        await fs.rm(target, { force: true });
        await fs.rename(tmp, target);
      }

      await fs.copyFile(target, backup).catch(() => undefined);
    } finally {
      await fs.rm(tmp, { force: true }).catch(() => undefined);
    }
  }
}
