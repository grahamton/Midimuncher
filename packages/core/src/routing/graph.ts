export type RouteFilter = {
  allowTypes?: Array<"noteOn" | "noteOff" | "cc" | "pitchBend" | "aftertouch" | "clock" | "start" | "stop" | "continue">;
  allowCCs?: number[];
  denyCCs?: number[];
  clockDiv?: number;
};

export type RouteRule = {
  id: string;
  fromPortId: string;
  toPortId: string;
  channelMode?: "passthrough" | "force";
  forceChannel?: number;
  filter?: RouteFilter;
};

export type RoutingGraph = {
  ports: Array<{ id: string; name: string; kind: "in" | "out" | "virtual" }>;
  routes: RouteRule[];
};
