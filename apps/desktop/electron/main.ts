import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { computeMappingSends } from "@midi-playground/core";
import type { MidiEvent } from "@midi-playground/core";
import type { MappingEmitPayload, MidiSendPayload, RouteConfig } from "../shared/ipcTypes";
import type { ProjectState, SequencerApplyPayload } from "../shared/projectTypes";
import type { BackendId } from "./backends/types";
import { MidiBridge } from "./midiBridge";
import { ProjectStore } from "./projectStore";
import { SnapshotService } from "./snapshotService";
import { SequencerHost } from "./sequencerHost";

const midiBridge = new MidiBridge();
const snapshotService = new SnapshotService(midiBridge);
const sequencerHost = new SequencerHost(midiBridge);
let projectStore: ProjectStore | null = null;
const isDev = !app.isPackaged;
const appDir = __dirname;

let mainWindow: BrowserWindow | null = null;
let quitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(appDir, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const rendererUrl =
    (isDev && process.env.VITE_DEV_SERVER_URL) || `file://${path.join(appDir, "../dist/index.html")}`;

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadURL(rendererUrl);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.midimuncher.desktop");
  projectStore = new ProjectStore({ dir: app.getPath("userData") });
  createWindow();

  ipcMain.handle("midi:listPorts", () => midiBridge.listPorts());
  ipcMain.handle("midi:listBackends", () => midiBridge.listBackends());
  ipcMain.handle("midi:setBackend", (_event, id: BackendId) => midiBridge.setBackend(id));
  ipcMain.handle("midi:openIn", (_event, id: string) => midiBridge.openIn(id));
  ipcMain.handle("midi:openOut", (_event, id: string) => midiBridge.openOut(id));
  ipcMain.handle("midi:send", (_event, payload: MidiSendPayload) => midiBridge.send(payload));
  ipcMain.handle("midi:setRoutes", (_event, routes: RouteConfig[]) => midiBridge.setRoutes(routes));

  ipcMain.handle("mapping:emit", async (_event, payload: MappingEmitPayload) => {
    try {
      const sends = computeMappingSends(payload.control, payload.value, payload.devices);
      for (const send of sends) {
        await midiBridge.openOut(send.portId);
        await midiBridge.send({ portId: send.portId, msg: send.msg });
      }
      return true;
    } catch (err) {
      console.error("mapping:emit failed", err);
      return false;
    }
  });

  ipcMain.handle("project:load", async () => {
    if (!projectStore) return null;
    const doc = await projectStore.load();
    snapshotService.updateDevices(doc.state.devices);
    return doc;
  });
  ipcMain.handle("project:setState", (_event, state: ProjectState) => {
    if (!projectStore) return false;
    projectStore.setState(state);
    snapshotService.updateDevices(state.devices);
    return true;
  });
  ipcMain.handle("project:flush", async () => {
    if (!projectStore) return false;
    await projectStore.flush();
    return true;
  });
  ipcMain.handle("snapshot:capture", (_event, payload: SnapshotCapturePayload) => snapshotService.capture(payload));
  ipcMain.handle("snapshot:recall", (_event, payload: SnapshotRecallPayload) => snapshotService.recall(payload));

  ipcMain.handle("sequencer:apply", (_event, payload: SequencerApplyPayload) => {
    return sequencerHost.apply(payload);
  });

  midiBridge.on("midi", (evt: MidiEvent) => {
    snapshotService.ingest(evt);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("midi:event", evt);
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", (e) => {
  if (quitting) return;
  quitting = true;

  if (projectStore) {
    e.preventDefault();
    void projectStore
      .flush()
      .catch(() => undefined)
      .finally(() => {
        void midiBridge.closeAll();
        app.exit(0);
      });
    return;
  }

  void midiBridge.closeAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
