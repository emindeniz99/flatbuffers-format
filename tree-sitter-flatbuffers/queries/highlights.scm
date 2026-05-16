; Highlight queries for FlatBuffers schemas.
; Tree-sitter capture taxonomy: see https://docs.helix-editor.com/themes.html
; and the nvim-treesitter highlight conventions.

; ---------- comments ----------
(line_comment) @comment
(block_comment) @comment
(doc_comment) @comment.documentation

; ---------- top-level keywords ----------
[
  "namespace"
  "include"
  "native_include"
  "attribute"
  "root_type"
  "file_extension"
  "file_identifier"
] @keyword

[
  "table"
  "struct"
  "enum"
  "union"
  "rpc_service"
] @keyword.type

; ---------- punctuation ----------
[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  ","
  ";"
  ":"
  "."
] @punctuation.delimiter

[
  "="
  "+"
  "-"
] @operator

; ---------- declarations: name positions ----------
(table_decl   name: (identifier) @type.definition)
(struct_decl  name: (identifier) @type.definition)
(enum_decl    name: (identifier) @type.definition)
(union_decl   name: (identifier) @type.definition)
(rpc_service_decl name: (identifier) @type.definition)

(field_decl name: (identifier) @variable.member)
(enum_value_decl  name: (identifier) @constructor)
(union_value_decl alias: (identifier) @variable.member)
(rpc_method name: (identifier) @function.method)
(metadata_entry key: (identifier) @attribute)
(object_field key: (identifier) @property)

; ---------- type references ----------
; All non-builtin type identifiers in type_ref / dotted_identifier
; positions are types. Builtin scalar types get the special @type.builtin
; capture so themes can colour them differently.
((identifier) @type.builtin
 (#match? @type.builtin "^(bool|byte|ubyte|short|ushort|int|uint|long|ulong|float|double|string|int8|uint8|int16|uint16|int32|uint32|int64|uint64|float32|float64)$"))

(type_ref (dotted_identifier (identifier) @type))
(union_value_decl type: (dotted_identifier (identifier) @type))
(rpc_method request:  (dotted_identifier (identifier) @type))
(rpc_method response: (dotted_identifier (identifier) @type))
(root_type_decl   type: (dotted_identifier (identifier) @type))
(namespace_decl   name: (dotted_identifier (identifier) @namespace))
(enum_decl  underlying_type: (identifier) @type.builtin)
(union_decl underlying_type: (identifier) @type.builtin)

; ---------- literals ----------
(string_literal) @string
(int_literal) @number
(float_literal) @number.float
(hex_float_literal) @number.float

; `inf` / `nan` as bare identifiers in scalar position — promote to
; @constant.builtin. true/false as well.
((scalar (identifier) @constant.builtin)
 (#any-of? @constant.builtin "true" "false" "inf" "nan"))
