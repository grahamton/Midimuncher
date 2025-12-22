/**
 * Instrument Definition Schema
 *
 * A portable JSON format for describing MIDI instruments, their capabilities,
 * and their control parameters.
 *
 * TODO: Add Zod for runtime validation once dependency is vetted.
 */

export type InstrumentParamType = "cc" | "nrpn";

export interface InstrumentParamMsg {
  type: InstrumentParamType;
  /**
   * For CC: The CC number (0-127)
   * For NRPN: The MSB (99) value is implied, this is the parameter index (MSB << 7 | LSB).
   * Actually, let's keep it simple: index is the CC number or the NRPN number.
   */
  index: number;
  /**
   * For NRPN: Optional LSB if we need 14-bit addressing logic split out.
   */
  lsb?: number;
}

export interface InstrumentParamRange {
  min: number;
  max: number;
  default?: number;
}

export interface InstrumentParam {
  /**
   * Unique identifier within the instrument (e.g. "filter_cutoff")
   */
  id: string;
  /**
   * Human readable label (e.g. "Filter Cutoff")
   */
  label: string;
  /**
   * Logical grouping (e.g. "Filter", "Oscillator", "LFO")
   */
  category?: string;
  /**
   * Semantic tags for smart mapping (e.g. "cutoff", "resonance", "attack")
   */
  tags: string[];
  /**
   * The MIDI message required to control this parameter
   */
  msg: InstrumentParamMsg;
  /**
   * Value range (default 0-127 for CC)
   */
  range?: InstrumentParamRange;
  /**
   * Optional discrete labels for specific values
   * e.g. { 0: "Off", 64: "On" } or { 0: "Saw", 1: "Square" }
   */
  valueLabels?: Record<number, string>;
}

export interface InstrumentMeta {
  /**
   * Optional unique ID for legacy migration or strict referencing.
   * If omitted, a composite key of vendor_model is used.
   */
  id?: string;
  vendor: string;
  model: string;
  version: string;
  tags: string[];
}

export interface InstrumentConnection {
  /**
   * Preferred MIDI channel (1-16)
   */
  defaultChannel: number;
}

export interface InstrumentDef {
  meta: InstrumentMeta;
  connection: InstrumentConnection;
  parameters: InstrumentParam[];
}
