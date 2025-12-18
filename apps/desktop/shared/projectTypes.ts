import type { ControlElement } from "@midi-playground/core";
import type { RouteConfig } from "./ipcTypes";

export type DeviceConfig = {
  id: string;
  name: string;
  instrumentId: string | null;
  inputId: string | null;
  outputId: string | null;
  channel: number;
  clockEnabled: boolean;
};

export type AppView = "setup" | "routes" | "mapping" | "monitor" | "help";

export type ProjectStateV1 = {
  backendId: string | null;
  selectedIn: string | null;
  selectedOut: string | null;
  activeView: AppView;
  selectedDeviceId: string | null;
  devices: DeviceConfig[];
  routes: RouteConfig[];
  controls: ControlElement[];
  selectedControlId: string | null;
  ui: {
    routeBuilder: {
      forceChannelEnabled: boolean;
      routeChannel: number;
      allowNotes: boolean;
      allowCc: boolean;
      allowExpression: boolean;
      allowTransport: boolean;
      allowClock: boolean;
      clockDiv: number;
    };
    diagnostics: {
      note: number;
      ccValue: number;
    };
  };
};

export type ProjectDocV1 = {
  schemaVersion: 1;
  updatedAt: number; // epoch ms
  state: ProjectStateV1;
};

export function defaultProjectState(): ProjectStateV1 {
  return {
    backendId: null,
    selectedIn: null,
    selectedOut: null,
    activeView: "setup",
    selectedDeviceId: null,
    devices: [],
    routes: [],
    controls: [],
    selectedControlId: null,
    ui: {
      routeBuilder: {
        forceChannelEnabled: true,
        routeChannel: 1,
        allowNotes: true,
        allowCc: true,
        allowExpression: true,
        allowTransport: true,
        allowClock: true,
        clockDiv: 1
      },
      diagnostics: {
        note: 60,
        ccValue: 64
      }
    }
  };
}

export function defaultProjectDoc(): ProjectDocV1 {
  return {
    schemaVersion: 1,
    updatedAt: Date.now(),
    state: defaultProjectState()
  };
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBooleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function coerceProjectDoc(raw: unknown): ProjectDocV1 {
  const fallback = defaultProjectDoc();
  if (!raw || typeof raw !== "object") return fallback;

  const rec = raw as Record<string, unknown>;
  if (rec.schemaVersion !== 1) return fallback;

  const rawState = (rec.state && typeof rec.state === "object" ? (rec.state as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const stateDefaults = defaultProjectState();

  const view = rawState.activeView;
  const activeView: AppView =
    view === "setup" || view === "routes" || view === "mapping" || view === "monitor" || view === "help"
      ? view
      : "setup";

  const devices: DeviceConfig[] = asArray<Record<string, unknown>>(rawState.devices).map((d, idx) => ({
    id: typeof d.id === "string" ? d.id : `device-${idx + 1}`,
    name: typeof d.name === "string" ? d.name : `Device ${idx + 1}`,
    instrumentId: asStringOrNull(d.instrumentId),
    inputId: asStringOrNull(d.inputId),
    outputId: asStringOrNull(d.outputId),
    channel: Math.min(Math.max(Math.round(asNumberOr(d.channel, 1)), 1), 16),
    clockEnabled: asBooleanOr(d.clockEnabled, false)
  }));

  return {
    schemaVersion: 1,
    updatedAt: asNumberOr(rec.updatedAt, Date.now()),
    state: {
      backendId: asStringOrNull(rawState.backendId),
      selectedIn: asStringOrNull(rawState.selectedIn),
      selectedOut: asStringOrNull(rawState.selectedOut),
      activeView,
      selectedDeviceId: asStringOrNull(rawState.selectedDeviceId),
      devices,
      routes: asArray<RouteConfig>(rawState.routes),
      controls: asArray<ControlElement>(rawState.controls),
      selectedControlId: asStringOrNull(rawState.selectedControlId),
      ui: {
        routeBuilder: {
          forceChannelEnabled: asBooleanOr((rawState.ui as any)?.routeBuilder?.forceChannelEnabled, stateDefaults.ui.routeBuilder.forceChannelEnabled),
          routeChannel: Math.min(
            Math.max(Math.round(asNumberOr((rawState.ui as any)?.routeBuilder?.routeChannel, stateDefaults.ui.routeBuilder.routeChannel)), 1),
            16
          ),
          allowNotes: asBooleanOr((rawState.ui as any)?.routeBuilder?.allowNotes, stateDefaults.ui.routeBuilder.allowNotes),
          allowCc: asBooleanOr((rawState.ui as any)?.routeBuilder?.allowCc, stateDefaults.ui.routeBuilder.allowCc),
          allowExpression: asBooleanOr(
            (rawState.ui as any)?.routeBuilder?.allowExpression,
            stateDefaults.ui.routeBuilder.allowExpression
          ),
          allowTransport: asBooleanOr(
            (rawState.ui as any)?.routeBuilder?.allowTransport,
            stateDefaults.ui.routeBuilder.allowTransport
          ),
          allowClock: asBooleanOr((rawState.ui as any)?.routeBuilder?.allowClock, stateDefaults.ui.routeBuilder.allowClock),
          clockDiv: Math.min(
            Math.max(Math.round(asNumberOr((rawState.ui as any)?.routeBuilder?.clockDiv, stateDefaults.ui.routeBuilder.clockDiv)), 1),
            96
          )
        },
        diagnostics: {
          note: Math.min(Math.max(Math.round(asNumberOr((rawState.ui as any)?.diagnostics?.note, stateDefaults.ui.diagnostics.note)), 0), 127),
          ccValue: Math.min(
            Math.max(Math.round(asNumberOr((rawState.ui as any)?.diagnostics?.ccValue, stateDefaults.ui.diagnostics.ccValue)), 0),
            127
          )
        }
      }
    }
  };
}
