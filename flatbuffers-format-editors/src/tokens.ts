// Shared token vocabulary across all three editor integrations.
// Keep in sync with the IntelliJ Kotlin lexer + the VS Code TextMate
// grammar — the engine grammar (`grammar/FlatBuffers.g4`) is the
// source of truth.

export const KEYWORDS = [
  "namespace",
  "table",
  "struct",
  "enum",
  "union",
  "root_type",
  "file_extension",
  "file_identifier",
  "attribute",
  "rpc_service",
  "include",
  "native_include",
] as const;

export const BUILTIN_TYPES = [
  "bool",
  "byte",
  "ubyte",
  "short",
  "ushort",
  "int",
  "uint",
  "long",
  "ulong",
  "float",
  "double",
  "string",
  "int8",
  "int16",
  "int32",
  "int64",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "float32",
  "float64",
] as const;

export const BOOL_LITERALS = ["true", "false"] as const;

// `null` is rare in FlatBuffers attributes but accepted by the parser;
// `inf`/`nan` (and their signed forms) are valid float literals.
export const FLOAT_KEYWORDS = ["null", "inf", "nan"] as const;
