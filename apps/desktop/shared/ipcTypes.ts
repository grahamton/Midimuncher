import type { ControlElement, MidiMsg } from "@midi-playground/core";

export type MidiPortInfo = {
  id: string;
  name: string;
  direction: "in" | "out";
};

export type MidiPorts = {
  inputs: MidiPortInfo[];
  outputs: MidiPortInfo[];
};

export type MidiBackendInfo = {
  id: string;
  label: string;
  available: boolean;
  selected: boolean;
};

export type MidiSendPayload = {
  portId: string;
  msg: MidiMsg;
};

export type MappingEmitPayload = {
  control: ControlElement;
  value: number;
  devices: Array<{
    id: string;
    outputId: string | null;
    channel: number;
  }>;
};

export type RouteFilter = {
  allowTypes?: MidiMsg["t"][];
  allowCCs?: number[];
  denyCCs?: number[];
  clockDiv?: number;
};

export type RouteConfig = {
  id: string;
  fromId: string;
  toId: string;
  channelMode?: "passthrough" | "force";
  forceChannel?: number;
  filter?: RouteFilter;
};
