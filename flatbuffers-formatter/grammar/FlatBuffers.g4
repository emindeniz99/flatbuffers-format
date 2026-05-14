grammar FlatBuffers;

// ---------------------------------------------------------------------------
// FlatBuffers schema grammar (.fbs) for ANTLR4 / antlr-ng.
//
// Adapted from the official grammar reference:
//   https://flatbuffers.dev/flatbuffers_grammar.html
//
// Comments are routed to channel(HIDDEN) so they don't interfere with
// parsing; the formatter recovers them from the token stream via
// `getHiddenTokensToLeft`. Doc comments (`///`) are kept on their own
// channel so we can distinguish them from regular line comments.
// ---------------------------------------------------------------------------

schema
    : decl* EOF
    ;

decl
    : includeDecl
    | namespaceDecl
    | attributeDecl
    | rootTypeDecl
    | fileExtensionDecl
    | fileIdentifierDecl
    | tableDecl
    | structDecl
    | enumDecl
    | unionDecl
    | rpcServiceDecl
    | objectLiteralDecl
    ;

includeDecl        : 'include' STRING_LITERAL ';' ;
namespaceDecl      : 'namespace' IDENT ('.' IDENT)* ';' ;
attributeDecl      : 'attribute' (STRING_LITERAL | IDENT) ';' ;
rootTypeDecl       : 'root_type' IDENT ';' ;
fileExtensionDecl  : 'file_extension' STRING_LITERAL ';' ;
fileIdentifierDecl : 'file_identifier' STRING_LITERAL ';' ;

tableDecl  : 'table'  IDENT metadata? '{' fieldDecl* '}' ;
structDecl : 'struct' IDENT metadata? '{' fieldDecl* '}' ;

fieldDecl  : IDENT ':' typeRef ('=' scalar)? metadata? ';' ;

typeRef
    : '[' typeRef ']'                              # vectorType
    | IDENT                                        # namedType
    ;

enumDecl
    : 'enum' IDENT (':' IDENT)? metadata?
      '{' (enumValDecl (',' enumValDecl)* ','?)? '}'
    ;

enumValDecl : IDENT ('=' scalar)? ;

unionDecl
    : 'union' IDENT metadata?
      '{' (unionValDecl (',' unionValDecl)* ','?)? '}'
    ;

unionValDecl
    : IDENT ':' IDENT     # unionAliasVal
    | IDENT               # unionPlainVal
    ;

rpcServiceDecl : 'rpc_service' IDENT '{' rpcMethod* '}' ;
rpcMethod      : IDENT '(' IDENT ')' ':' IDENT metadata? ';' ;

metadata        : '(' (metadataEntry (',' metadataEntry)*)? ')' ;
metadataEntry   : IDENT (':' singleValue)? ;

singleValue : scalar | STRING_LITERAL ;

scalar
    : ('+' | '-')? INT_LITERAL       # intScalar
    | ('+' | '-')? FLOAT_LITERAL     # floatScalar
    | STRING_LITERAL                 # stringScalar
    | IDENT                          # identScalar
    ;

objectLiteralDecl : objectLiteral ;
objectLiteral     : '{' (objectField (',' objectField)*)? '}' ;
objectField       : (IDENT | STRING_LITERAL) ':' objectValue ;
objectValue
    : scalar                                                  # scalarValue
    | objectLiteral                                           # nestedObjectValue
    | '[' (objectValue (',' objectValue)*)? ']'               # arrayValue
    ;

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

// Keep these tokens defined as implicit string literals above so
// rule references read naturally. The lexer rules below only cover
// literals + identifiers + skip rules.

INT_LITERAL    : '0' [xX] [0-9a-fA-F]+
               | [0-9]+
               ;

FLOAT_LITERAL  : [0-9]+ '.' [0-9]* EXP?
               | '.' [0-9]+ EXP?
               | [0-9]+ EXP
               ;

fragment EXP   : [eE] [+\-]? [0-9]+ ;

STRING_LITERAL : '"' (~["\\\r\n] | '\\' .)* '"' ;

IDENT          : [a-zA-Z_] [a-zA-Z_0-9]* ;

// Doc comments declared first so they win the longest-match tie
// against LINE_COMMENT.
DOC_COMMENT    : '///' ~[\r\n]* -> channel(HIDDEN) ;
LINE_COMMENT   : '//'  ~[\r\n]* -> channel(HIDDEN) ;
BLOCK_COMMENT  : '/*' .*? '*/'  -> channel(HIDDEN) ;
WS             : [ \t\r\n]+     -> channel(HIDDEN) ;
