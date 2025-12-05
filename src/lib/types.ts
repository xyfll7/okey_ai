/**
 * TypeScript interface definition for InputData
 * Corresponds to the Rust struct in src-tauri/src/types.rs
 */
export interface InputData {
  input_time_stamp: string;
  input_text: string;
  response_text?: string;
}