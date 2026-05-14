
import { ErrorNode, ParseTreeListener, ParserRuleContext, TerminalNode } from "antlr4ng";


import { SchemaContext } from "./FlatBuffersParser.js";
import { DeclContext } from "./FlatBuffersParser.js";
import { IncludeDeclContext } from "./FlatBuffersParser.js";
import { NamespaceDeclContext } from "./FlatBuffersParser.js";
import { AttributeDeclContext } from "./FlatBuffersParser.js";
import { RootTypeDeclContext } from "./FlatBuffersParser.js";
import { FileExtensionDeclContext } from "./FlatBuffersParser.js";
import { FileIdentifierDeclContext } from "./FlatBuffersParser.js";
import { TableDeclContext } from "./FlatBuffersParser.js";
import { StructDeclContext } from "./FlatBuffersParser.js";
import { FieldDeclContext } from "./FlatBuffersParser.js";
import { VectorTypeContext } from "./FlatBuffersParser.js";
import { NamedTypeContext } from "./FlatBuffersParser.js";
import { EnumDeclContext } from "./FlatBuffersParser.js";
import { EnumValDeclContext } from "./FlatBuffersParser.js";
import { UnionDeclContext } from "./FlatBuffersParser.js";
import { UnionAliasValContext } from "./FlatBuffersParser.js";
import { UnionPlainValContext } from "./FlatBuffersParser.js";
import { RpcServiceDeclContext } from "./FlatBuffersParser.js";
import { RpcMethodContext } from "./FlatBuffersParser.js";
import { MetadataContext } from "./FlatBuffersParser.js";
import { MetadataEntryContext } from "./FlatBuffersParser.js";
import { SingleValueContext } from "./FlatBuffersParser.js";
import { IntScalarContext } from "./FlatBuffersParser.js";
import { FloatScalarContext } from "./FlatBuffersParser.js";
import { StringScalarContext } from "./FlatBuffersParser.js";
import { IdentScalarContext } from "./FlatBuffersParser.js";
import { ObjectLiteralDeclContext } from "./FlatBuffersParser.js";
import { ObjectLiteralContext } from "./FlatBuffersParser.js";
import { ObjectFieldContext } from "./FlatBuffersParser.js";
import { ScalarValueContext } from "./FlatBuffersParser.js";
import { NestedObjectValueContext } from "./FlatBuffersParser.js";
import { ArrayValueContext } from "./FlatBuffersParser.js";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `FlatBuffersParser`.
 */
export class FlatBuffersListener implements ParseTreeListener {
    /**
     * Enter a parse tree produced by `FlatBuffersParser.schema`.
     * @param ctx the parse tree
     */
    enterSchema?: (ctx: SchemaContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.schema`.
     * @param ctx the parse tree
     */
    exitSchema?: (ctx: SchemaContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.decl`.
     * @param ctx the parse tree
     */
    enterDecl?: (ctx: DeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.decl`.
     * @param ctx the parse tree
     */
    exitDecl?: (ctx: DeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.includeDecl`.
     * @param ctx the parse tree
     */
    enterIncludeDecl?: (ctx: IncludeDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.includeDecl`.
     * @param ctx the parse tree
     */
    exitIncludeDecl?: (ctx: IncludeDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.namespaceDecl`.
     * @param ctx the parse tree
     */
    enterNamespaceDecl?: (ctx: NamespaceDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.namespaceDecl`.
     * @param ctx the parse tree
     */
    exitNamespaceDecl?: (ctx: NamespaceDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.attributeDecl`.
     * @param ctx the parse tree
     */
    enterAttributeDecl?: (ctx: AttributeDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.attributeDecl`.
     * @param ctx the parse tree
     */
    exitAttributeDecl?: (ctx: AttributeDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.rootTypeDecl`.
     * @param ctx the parse tree
     */
    enterRootTypeDecl?: (ctx: RootTypeDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.rootTypeDecl`.
     * @param ctx the parse tree
     */
    exitRootTypeDecl?: (ctx: RootTypeDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.fileExtensionDecl`.
     * @param ctx the parse tree
     */
    enterFileExtensionDecl?: (ctx: FileExtensionDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.fileExtensionDecl`.
     * @param ctx the parse tree
     */
    exitFileExtensionDecl?: (ctx: FileExtensionDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.fileIdentifierDecl`.
     * @param ctx the parse tree
     */
    enterFileIdentifierDecl?: (ctx: FileIdentifierDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.fileIdentifierDecl`.
     * @param ctx the parse tree
     */
    exitFileIdentifierDecl?: (ctx: FileIdentifierDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.tableDecl`.
     * @param ctx the parse tree
     */
    enterTableDecl?: (ctx: TableDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.tableDecl`.
     * @param ctx the parse tree
     */
    exitTableDecl?: (ctx: TableDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.structDecl`.
     * @param ctx the parse tree
     */
    enterStructDecl?: (ctx: StructDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.structDecl`.
     * @param ctx the parse tree
     */
    exitStructDecl?: (ctx: StructDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.fieldDecl`.
     * @param ctx the parse tree
     */
    enterFieldDecl?: (ctx: FieldDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.fieldDecl`.
     * @param ctx the parse tree
     */
    exitFieldDecl?: (ctx: FieldDeclContext) => void;
    /**
     * Enter a parse tree produced by the `vectorType`
     * labeled alternative in `FlatBuffersParser.typeRef`.
     * @param ctx the parse tree
     */
    enterVectorType?: (ctx: VectorTypeContext) => void;
    /**
     * Exit a parse tree produced by the `vectorType`
     * labeled alternative in `FlatBuffersParser.typeRef`.
     * @param ctx the parse tree
     */
    exitVectorType?: (ctx: VectorTypeContext) => void;
    /**
     * Enter a parse tree produced by the `namedType`
     * labeled alternative in `FlatBuffersParser.typeRef`.
     * @param ctx the parse tree
     */
    enterNamedType?: (ctx: NamedTypeContext) => void;
    /**
     * Exit a parse tree produced by the `namedType`
     * labeled alternative in `FlatBuffersParser.typeRef`.
     * @param ctx the parse tree
     */
    exitNamedType?: (ctx: NamedTypeContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.enumDecl`.
     * @param ctx the parse tree
     */
    enterEnumDecl?: (ctx: EnumDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.enumDecl`.
     * @param ctx the parse tree
     */
    exitEnumDecl?: (ctx: EnumDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.enumValDecl`.
     * @param ctx the parse tree
     */
    enterEnumValDecl?: (ctx: EnumValDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.enumValDecl`.
     * @param ctx the parse tree
     */
    exitEnumValDecl?: (ctx: EnumValDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.unionDecl`.
     * @param ctx the parse tree
     */
    enterUnionDecl?: (ctx: UnionDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.unionDecl`.
     * @param ctx the parse tree
     */
    exitUnionDecl?: (ctx: UnionDeclContext) => void;
    /**
     * Enter a parse tree produced by the `unionAliasVal`
     * labeled alternative in `FlatBuffersParser.unionValDecl`.
     * @param ctx the parse tree
     */
    enterUnionAliasVal?: (ctx: UnionAliasValContext) => void;
    /**
     * Exit a parse tree produced by the `unionAliasVal`
     * labeled alternative in `FlatBuffersParser.unionValDecl`.
     * @param ctx the parse tree
     */
    exitUnionAliasVal?: (ctx: UnionAliasValContext) => void;
    /**
     * Enter a parse tree produced by the `unionPlainVal`
     * labeled alternative in `FlatBuffersParser.unionValDecl`.
     * @param ctx the parse tree
     */
    enterUnionPlainVal?: (ctx: UnionPlainValContext) => void;
    /**
     * Exit a parse tree produced by the `unionPlainVal`
     * labeled alternative in `FlatBuffersParser.unionValDecl`.
     * @param ctx the parse tree
     */
    exitUnionPlainVal?: (ctx: UnionPlainValContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.rpcServiceDecl`.
     * @param ctx the parse tree
     */
    enterRpcServiceDecl?: (ctx: RpcServiceDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.rpcServiceDecl`.
     * @param ctx the parse tree
     */
    exitRpcServiceDecl?: (ctx: RpcServiceDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.rpcMethod`.
     * @param ctx the parse tree
     */
    enterRpcMethod?: (ctx: RpcMethodContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.rpcMethod`.
     * @param ctx the parse tree
     */
    exitRpcMethod?: (ctx: RpcMethodContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.metadata`.
     * @param ctx the parse tree
     */
    enterMetadata?: (ctx: MetadataContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.metadata`.
     * @param ctx the parse tree
     */
    exitMetadata?: (ctx: MetadataContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.metadataEntry`.
     * @param ctx the parse tree
     */
    enterMetadataEntry?: (ctx: MetadataEntryContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.metadataEntry`.
     * @param ctx the parse tree
     */
    exitMetadataEntry?: (ctx: MetadataEntryContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.singleValue`.
     * @param ctx the parse tree
     */
    enterSingleValue?: (ctx: SingleValueContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.singleValue`.
     * @param ctx the parse tree
     */
    exitSingleValue?: (ctx: SingleValueContext) => void;
    /**
     * Enter a parse tree produced by the `intScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    enterIntScalar?: (ctx: IntScalarContext) => void;
    /**
     * Exit a parse tree produced by the `intScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    exitIntScalar?: (ctx: IntScalarContext) => void;
    /**
     * Enter a parse tree produced by the `floatScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    enterFloatScalar?: (ctx: FloatScalarContext) => void;
    /**
     * Exit a parse tree produced by the `floatScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    exitFloatScalar?: (ctx: FloatScalarContext) => void;
    /**
     * Enter a parse tree produced by the `stringScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    enterStringScalar?: (ctx: StringScalarContext) => void;
    /**
     * Exit a parse tree produced by the `stringScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    exitStringScalar?: (ctx: StringScalarContext) => void;
    /**
     * Enter a parse tree produced by the `identScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    enterIdentScalar?: (ctx: IdentScalarContext) => void;
    /**
     * Exit a parse tree produced by the `identScalar`
     * labeled alternative in `FlatBuffersParser.scalar`.
     * @param ctx the parse tree
     */
    exitIdentScalar?: (ctx: IdentScalarContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.objectLiteralDecl`.
     * @param ctx the parse tree
     */
    enterObjectLiteralDecl?: (ctx: ObjectLiteralDeclContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.objectLiteralDecl`.
     * @param ctx the parse tree
     */
    exitObjectLiteralDecl?: (ctx: ObjectLiteralDeclContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.objectLiteral`.
     * @param ctx the parse tree
     */
    enterObjectLiteral?: (ctx: ObjectLiteralContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.objectLiteral`.
     * @param ctx the parse tree
     */
    exitObjectLiteral?: (ctx: ObjectLiteralContext) => void;
    /**
     * Enter a parse tree produced by `FlatBuffersParser.objectField`.
     * @param ctx the parse tree
     */
    enterObjectField?: (ctx: ObjectFieldContext) => void;
    /**
     * Exit a parse tree produced by `FlatBuffersParser.objectField`.
     * @param ctx the parse tree
     */
    exitObjectField?: (ctx: ObjectFieldContext) => void;
    /**
     * Enter a parse tree produced by the `scalarValue`
     * labeled alternative in `FlatBuffersParser.objectValue`.
     * @param ctx the parse tree
     */
    enterScalarValue?: (ctx: ScalarValueContext) => void;
    /**
     * Exit a parse tree produced by the `scalarValue`
     * labeled alternative in `FlatBuffersParser.objectValue`.
     * @param ctx the parse tree
     */
    exitScalarValue?: (ctx: ScalarValueContext) => void;
    /**
     * Enter a parse tree produced by the `nestedObjectValue`
     * labeled alternative in `FlatBuffersParser.objectValue`.
     * @param ctx the parse tree
     */
    enterNestedObjectValue?: (ctx: NestedObjectValueContext) => void;
    /**
     * Exit a parse tree produced by the `nestedObjectValue`
     * labeled alternative in `FlatBuffersParser.objectValue`.
     * @param ctx the parse tree
     */
    exitNestedObjectValue?: (ctx: NestedObjectValueContext) => void;
    /**
     * Enter a parse tree produced by the `arrayValue`
     * labeled alternative in `FlatBuffersParser.objectValue`.
     * @param ctx the parse tree
     */
    enterArrayValue?: (ctx: ArrayValueContext) => void;
    /**
     * Exit a parse tree produced by the `arrayValue`
     * labeled alternative in `FlatBuffersParser.objectValue`.
     * @param ctx the parse tree
     */
    exitArrayValue?: (ctx: ArrayValueContext) => void;

    visitTerminal(node: TerminalNode): void {}
    visitErrorNode(node: ErrorNode): void {}
    enterEveryRule(node: ParserRuleContext): void {}
    exitEveryRule(node: ParserRuleContext): void {}
}

