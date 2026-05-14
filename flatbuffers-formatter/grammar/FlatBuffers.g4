grammar FlatBuffers;

// ---------------------------------------------------------------------------
// FlatBuffers schema grammar (.fbs) for ANTLR4 / antlr-ng.
//
// Reference: https://flatbuffers.dev/flatbuffers_grammar.html
//            https://github.com/antlr/grammars-v4/tree/master/flatbuffers
//
// Comments stay on channel(HIDDEN) so the formatter can recover them.
// Doc comments are a separate token type so we can distinguish `///`
// from `//` when re-emitting.
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

includeDecl        : (INCLUDE | NATIVE_INCLUDE) STRING_LITERAL ';' ;
namespaceDecl      : NAMESPACE identifier ('.' identifier)* ';' ;
attributeDecl      : ATTRIBUTE (STRING_LITERAL | identifier) ';' ;
rootTypeDecl       : ROOT_TYPE nsIdent ';' ;
fileExtensionDecl  : FILE_EXTENSION STRING_LITERAL ';' ;
fileIdentifierDecl : FILE_IDENTIFIER STRING_LITERAL ';' ;

tableDecl  : TABLE  identifier metadata? '{' fieldDecl* '}' ;
structDecl : STRUCT identifier metadata? '{' fieldDecl* '}' ;

fieldDecl  : identifier ':' typeRef ('=' scalar)? metadata? ';' ;

typeRef
    : '[' typeRef (':' INT_LITERAL)? ']'   # vectorType
    | nsIdent                              # namedType
    ;

nsIdent : identifier ('.' identifier)* ;

enumDecl
    : ENUM identifier (':' identifier)? metadata?
      '{' (enumValDecl (',' enumValDecl)* ','?)? '}'
    ;

enumValDecl : identifier ('=' scalar)? ;

unionDecl
    : UNION identifier metadata?
      '{' (unionValDecl (',' unionValDecl)* ','?)? '}'
    ;

unionValDecl
    : (identifier ':')? nsIdent
    ;

rpcServiceDecl : RPC_SERVICE identifier '{' rpcMethod* '}' ;
rpcMethod      : identifier '(' nsIdent ')' ':' nsIdent metadata? ';' ;

metadata        : '(' (metadataEntry (',' metadataEntry)*)? ')' ;
metadataEntry   : identifier (':' singleValue)? ;

singleValue : scalar | STRING_LITERAL ;

scalar
    : ('+' | '-')? INT_LITERAL       # intScalar
    | ('+' | '-')? FLOAT_LITERAL     # floatScalar
    | STRING_LITERAL                 # stringScalar
    | identifier                     # identScalar
    ;

objectLiteralDecl : objectLiteral ;
objectLiteral     : '{' (objectField (',' objectField)*)? '}' ;
objectField       : (identifier | STRING_LITERAL) ':' objectValue ;
objectValue
    : scalar                                                  # scalarValue
    | objectLiteral                                           # nestedObjectValue
    | '[' (objectValue (',' objectValue)*)? ']'               # arrayValue
    ;

identifier
    : IDENT
    | keywordAsIdent
    ;

// Anywhere a user-defined name is allowed, FlatBuffers accepts a
// keyword in that position (see grammars-v4). This list mirrors the
// declared keyword tokens below.
keywordAsIdent
    : TABLE
    | STRUCT
    | ENUM
    | UNION
    | NAMESPACE
    | INCLUDE
    | NATIVE_INCLUDE
    | ATTRIBUTE
    | ROOT_TYPE
    | FILE_EXTENSION
    | FILE_IDENTIFIER
    | RPC_SERVICE
    ;

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

// Keywords: declared before IDENT so the longest-match tie-break
// favors them (ANTLR convention).

TABLE           : 'table' ;
STRUCT          : 'struct' ;
ENUM            : 'enum' ;
UNION           : 'union' ;
NAMESPACE       : 'namespace' ;
INCLUDE         : 'include' ;
NATIVE_INCLUDE  : 'native_include' ;
ATTRIBUTE       : 'attribute' ;
ROOT_TYPE       : 'root_type' ;
FILE_EXTENSION  : 'file_extension' ;
FILE_IDENTIFIER : 'file_identifier' ;
RPC_SERVICE     : 'rpc_service' ;

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
