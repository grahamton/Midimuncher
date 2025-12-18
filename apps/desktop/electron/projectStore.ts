import type { ProjectDocV1, ProjectStateV1 } from "../shared/projectTypes";
import { coerceProjectDoc, defaultProjectDoc } from "../shared/projectTypes";
import { ProjectStorage } from "./projectStorage";

export type ProjectStoreOptions = {
  dir: string;
};

export class ProjectStore {
  private storage: ProjectStorage;
  private current: ProjectDocV1 | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private pendingSave: Promise<void> | null = null;

  constructor(opts: ProjectStoreOptions) {
    this.storage = new ProjectStorage({ dir: opts.dir, filename: "project.json" });
  }

  async load(): Promise<ProjectDocV1> {
    const raw = await this.storage.load(() => defaultProjectDoc());
    const doc = coerceProjectDoc(raw);
    this.current = doc;
    return doc;
  }

  get(): ProjectDocV1 {
    return this.current ?? defaultProjectDoc();
  }

  setState(state: ProjectStateV1): void {
    const doc: ProjectDocV1 = {
      schemaVersion: 1,
      updatedAt: Date.now(),
      state
    };
    this.current = doc;
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush();
    }, 300);
  }

  async flush(): Promise<void> {
    if (!this.current) return;
    if (this.pendingSave) return this.pendingSave;

    this.pendingSave = this.storage.save(this.current).finally(() => {
      this.pendingSave = null;
    });

    return this.pendingSave;
  }
}

