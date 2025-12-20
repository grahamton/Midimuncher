import { MidiBackend } from "./types";
import type { BackendId } from "./types";
import type { MidiPorts } from "../../shared/ipcTypes";
import { createRequire } from "node:module";

const require = createRequire(__filename);

type Runtime = {
  module: unknown;
  session: Record<string, unknown>;
};

type EndpointDescriptor = {
  portId: string;
  endpointId: string;
  name: string;
  direction: "in" | "out";
};

export class WindowsMidiServicesBackend extends MidiBackend {
  readonly id: BackendId = "windows-midi-services";
  readonly label = "Windows MIDI Services (preview)";

  private runtimePromise: Promise<Runtime | null> | null = null;
  private endpoints = new Map<string, EndpointDescriptor>();
  private inputs = new Map<string, unknown>();
  private outputs = new Map<string, unknown>();
  private cachedPorts: MidiPorts = { inputs: [], outputs: [] };

  async isAvailable(): Promise<boolean> {
    const runtime = await this.getRuntime();
    return runtime !== null;
  }

  async listPorts(): Promise<MidiPorts> {
    const runtime = await this.getRuntime();
    if (!runtime) {
      this.cachedPorts = { inputs: [], outputs: [] };
      this.endpoints.clear();
      return this.cachedPorts;
    }
    await this.refreshPorts(runtime.session);
    return this.cachedPorts;
  }

  async openIn(id: string): Promise<boolean> {
    if (this.inputs.has(id)) return true;
    const runtime = await this.getRuntime();
    const endpoint = this.endpoints.get(id);
    if (!runtime || !endpoint) return false;

    const connection = await this.openEndpoint(runtime.session, endpoint.endpointId, "in");
    if (!connection) return false;

    this.attachInputHandler(connection, id);
    this.inputs.set(id, connection);
    return true;
  }

  async openOut(id: string): Promise<boolean> {
    if (this.outputs.has(id)) return true;
    const runtime = await this.getRuntime();
    const endpoint = this.endpoints.get(id);
    if (!runtime || !endpoint) return false;

    const connection = await this.openEndpoint(runtime.session, endpoint.endpointId, "out");
    if (!connection) return false;

    this.outputs.set(id, connection);
    return true;
  }

  async send(portId: string, bytes: number[]): Promise<boolean> {
    const output =
      this.outputs.get(portId) ??
      (await this.openOut(portId).then((ok) => (ok ? this.outputs.get(portId) : undefined)));
    if (!output) return false;
    try {
      this.emitToOutput(output, bytes);
      return true;
    } catch (err) {
      console.error("Failed to send via Windows MIDI Services", err);
      return false;
    }
  }

  async closeAll(): Promise<void> {
    this.inputs.forEach((conn) => this.closeConnection(conn));
    this.outputs.forEach((conn) => this.closeConnection(conn));
    this.inputs.clear();
    this.outputs.clear();

    const runtime = this.runtimePromise ? await this.runtimePromise : null;
    const session = runtime?.session as Record<string, unknown> | undefined;
    if (session) {
      this.callFirst(session, ["close", "dispose", "shutdown", "disconnect"]);
    }
  }

  private async getRuntime(): Promise<Runtime | null> {
    if (this.runtimePromise) return this.runtimePromise;
    this.runtimePromise = this.initRuntime();
    return this.runtimePromise;
  }

  private async initRuntime(): Promise<Runtime | null> {
    if (process.platform !== "win32") return null;
    try {
      // Avoid noisy warnings in dev when the optional package isn't installed.
      require.resolve("windows-midi-services");
    } catch {
      return null;
    }
    try {
      const module = await import("windows-midi-services");
      const session = await this.createSession(module);
      if (!session) return null;
      return { module, session };
    } catch (err) {
      console.warn("Windows MIDI Services unavailable", err);
      return null;
    }
  }

  private async createSession(module: any): Promise<Record<string, unknown> | null> {
    const candidates = [module?.MidiSession, module?.Session, module?.default?.MidiSession, module?.default];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (typeof candidate.create === "function") {
        try {
          const created = await candidate.create({ name: "MIDI Playground" });
          if (created) return created as Record<string, unknown>;
        } catch {
          // Try the next candidate.
        }
      }
      if (typeof candidate === "function") {
        try {
          const instance = await Promise.resolve(new candidate({ name: "MIDI Playground" }));
          if (instance) return instance as Record<string, unknown>;
        } catch {
          // Keep looking.
        }
      }
    }
    if (typeof module?.createSession === "function") {
      try {
        const created = await module.createSession({ name: "MIDI Playground" });
        if (created) return created as Record<string, unknown>;
      } catch {
        // ignore
      }
    }
    return null;
  }

  private async refreshPorts(session: Record<string, unknown>) {
    this.endpoints.clear();
    const inputs = await this.readEndpoints(session, "in");
    const outputs = await this.readEndpoints(session, "out");
    this.cachedPorts = {
      inputs: inputs.map((p) => ({ id: p.portId, name: p.name, direction: "in" })),
      outputs: outputs.map((p) => ({ id: p.portId, name: p.name, direction: "out" }))
    };
    inputs.concat(outputs).forEach((endpoint) => this.endpoints.set(endpoint.portId, endpoint));
  }

  private async readEndpoints(
    session: Record<string, unknown>,
    direction: "in" | "out"
  ): Promise<EndpointDescriptor[]> {
    const methodNames =
      direction === "in"
        ? ["listInputs", "listInputPorts", "listInputEndpoints", "getInputs", "getInputPorts", "inputs"]
        : ["listOutputs", "listOutputPorts", "listOutputEndpoints", "getOutputs", "getOutputPorts", "outputs"];

    for (const name of methodNames) {
      const candidate = (session as any)[name];
      if (typeof candidate === "function") {
        try {
          const result = await candidate.call(session);
          const normalized = this.normalizeEndpoints(result, direction);
          if (normalized.length) return normalized;
        } catch {
          // Try the next method.
        }
      } else if (Array.isArray(candidate)) {
        const normalized = this.normalizeEndpoints(candidate, direction);
        if (normalized.length) return normalized;
      }
    }
    return [];
  }

  private normalizeEndpoints(rawList: unknown, direction: "in" | "out"): EndpointDescriptor[] {
    if (!Array.isArray(rawList)) return [];
    return rawList
      .map((raw, idx) => this.normalizeEndpoint(raw as Record<string, unknown>, direction, idx))
      .filter((v): v is EndpointDescriptor => Boolean(v));
  }

  private normalizeEndpoint(
    raw: Record<string, unknown>,
    direction: "in" | "out",
    idx: number
  ): EndpointDescriptor | null {
    const endpointId =
      (raw?.endpointId as string | undefined) ??
      (raw?.deviceId as string | undefined) ??
      (raw?.id as string | undefined) ??
      (raw?.connectionId as string | undefined) ??
      (raw?.instanceId as string | undefined) ??
      (raw?.uniqueId as string | undefined) ??
      (raw?.udi as string | undefined) ??
      `${direction}-${idx}`;
    const name =
      (raw?.name as string | undefined) ??
      (raw?.displayName as string | undefined) ??
      (raw?.endpointName as string | undefined) ??
      (raw?.friendlyName as string | undefined) ??
      (raw?.productName as string | undefined) ??
      `MIDI ${direction === "in" ? "In" : "Out"} ${idx}`;

    if (!endpointId) return null;
    return {
      portId: `${direction}:${endpointId}`,
      endpointId,
      name,
      direction
    };
  }

  private async openEndpoint(
    session: Record<string, unknown>,
    endpointId: string,
    direction: "in" | "out"
  ): Promise<unknown | null> {
    const openMethods =
      direction === "in"
        ? ["openInput", "openInputPort", "openInputEndpoint", "openReceiver", "openIn"]
        : ["openOutput", "openOutputPort", "openOutputEndpoint", "openSender", "openOut"];

    for (const method of openMethods) {
      const fn = (session as any)[method];
      if (typeof fn !== "function") continue;
      const opened = await this.tryOpen(fn, session, endpointId, direction);
      if (opened) return opened;
    }

    const generic = (session as any).openEndpoint ?? (session as any).open;
    if (typeof generic === "function") {
      const opened = await this.tryOpen(generic, session, endpointId, direction);
      if (opened) return opened;
    }

    return null;
  }

  private async tryOpen(
    fn: (...args: unknown[]) => unknown,
    ctx: Record<string, unknown>,
    endpointId: string,
    direction: "in" | "out"
  ): Promise<unknown | null> {
    try {
      const args =
        fn.length > 1
          ? [endpointId, { endpointId, direction, name: "MIDI Playground" }]
          : [endpointId];
      const result = await Promise.resolve(fn.apply(ctx, args));
      return result ?? null;
    } catch {
      return null;
    }
  }

  private attachInputHandler(connection: any, portId: string) {
    const emitPacket = (payload: unknown) => {
      const bytes = this.extractBytes(payload);
      if (bytes.length) {
        this.emit("midi", { portId, bytes });
      }
    };

    const listeners = [
      { type: "onmidimessage", assign: true },
      { type: "onmessage", assign: true },
      { type: "ondata", assign: true }
    ];

    for (const listener of listeners) {
      if (listener.assign && listener.type in connection) {
        (connection as any)[listener.type] = (evt: unknown) => emitPacket((evt as any)?.data ?? evt);
        return;
      }
    }

    const adders: Array<[string, string]> = [
      ["addEventListener", "midimessage"],
      ["addEventListener", "message"],
      ["addListener", "message"]
    ];
    for (const [adder, evt] of adders) {
      if (typeof connection[adder] === "function") {
        connection[adder](evt, (data: unknown) => emitPacket((data as any)?.data ?? data));
        return;
      }
    }

    if (typeof connection.on === "function") {
      const maybeOn = connection as { on: (name: string, handler: (data: unknown) => void) => void };
      ["midi", "message", "data"].forEach((event) => maybeOn.on(event, emitPacket));
      return;
    }

    if (typeof connection.addListener === "function") {
      connection.addListener("message", emitPacket);
    }
  }

  private emitToOutput(connection: any, bytes: number[]) {
    const buffer = Uint8Array.from(bytes);
    const methods = ["send", "sendMessage", "sendMidiMessage", "sendPacket", "sendEvent", "sendBuffer", "write"];
    for (const method of methods) {
      if (typeof connection[method] === "function") {
        connection[method](buffer);
        return;
      }
    }
    if ("output" in connection && typeof (connection as any).output?.send === "function") {
      (connection as any).output.send(buffer);
      return;
    }
    throw new Error("No send method found on Windows MIDI Services output connection");
  }

  private closeConnection(connection: any) {
    if (!connection) return;
    this.callFirst(connection, ["close", "disconnect", "dispose", "release", "shutdown"]);
  }

  private callFirst(target: Record<string, unknown>, methods: string[]) {
    for (const method of methods) {
      const fn = target[method];
      if (typeof fn === "function") {
        try {
          (fn as () => unknown).call(target);
          return;
        } catch {
          // move to next option
        }
      }
    }
  }

  private extractBytes(payload: unknown): number[] {
    if (!payload) return [];
    if (payload instanceof Uint8Array) return Array.from(payload);
    if (payload instanceof ArrayBuffer) return Array.from(new Uint8Array(payload));
    const data =
      (payload as any).bytes ??
      (payload as any).data ??
      (payload as any).message ??
      (payload as any).packet ??
      (payload as any).raw ??
      null;
    if (data instanceof Uint8Array) return Array.from(data);
    if (data instanceof ArrayBuffer) return Array.from(new Uint8Array(data));
    if (Array.isArray(data)) return data.map((v) => Number(v));
    if (Array.isArray(payload as any)) return (payload as any).map((v: unknown) => Number(v));
    return [];
  }
}
