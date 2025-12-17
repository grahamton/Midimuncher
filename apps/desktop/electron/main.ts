import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import type { MidiEvent } from "@midi-playground/core";
import type { MidiSendPayload, RouteConfig } from "../shared/ipcTypes";
import { MidiBridge } from "./midiBridge";

const midiBridge = new MidiBridge();
const isDev = !app.isPackaged;
const appDir = __dirname;

let mainWindow: BrowserWindow | null = null;

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
  createWindow();

  ipcMain.handle("midi:listPorts", () => midiBridge.listPorts());
  ipcMain.handle("midi:listBackends", () => midiBridge.listBackends());
  ipcMain.handle("midi:setBackend", (_event, id: string) => midiBridge.setBackend(id));
  ipcMain.handle("midi:openIn", (_event, id: string) => midiBridge.openIn(id));
  ipcMain.handle("midi:openOut", (_event, id: string) => midiBridge.openOut(id));
  ipcMain.handle("midi:send", (_event, payload: MidiSendPayload) => midiBridge.send(payload));
  ipcMain.handle("midi:setRoutes", (_event, routes: RouteConfig[]) => midiBridge.setRoutes(routes));

  midiBridge.on("midi", (evt: MidiEvent) => {
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

app.on("before-quit", () => {
  midiBridge.closeAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
