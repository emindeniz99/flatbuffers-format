; Symbol tags for ctags-style navigation.
; Captures map to the tree-sitter "tags" convention used by GitHub's
; code-navigation pipeline and `tree-sitter tags`.

(table_decl
  name: (identifier) @name) @definition.class

(struct_decl
  name: (identifier) @name) @definition.class

(enum_decl
  name: (identifier) @name) @definition.enum

(union_decl
  name: (identifier) @name) @definition.enum

(rpc_service_decl
  name: (identifier) @name) @definition.interface

(rpc_method
  name: (identifier) @name) @definition.method

(field_decl
  name: (identifier) @name) @definition.field

(enum_value_decl
  name: (identifier) @name) @definition.constant

(namespace_decl
  name: (dotted_identifier) @name) @definition.namespace
