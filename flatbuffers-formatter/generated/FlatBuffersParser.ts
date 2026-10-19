
import * as antlr from "antlr4ng";
import { Token } from "antlr4ng";

import { FlatBuffersListener } from "./FlatBuffersListener.js";
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;


export class FlatBuffersParser extends antlr.Parser {
    public static readonly T__0 = 1;
    public static readonly T__1 = 2;
    public static readonly T__2 = 3;
    public static readonly T__3 = 4;
    public static readonly T__4 = 5;
    public static readonly T__5 = 6;
    public static readonly T__6 = 7;
    public static readonly T__7 = 8;
    public static readonly T__8 = 9;
    public static readonly T__9 = 10;
    public static readonly T__10 = 11;
    public static readonly T__11 = 12;
    public static readonly T__12 = 13;
    public static readonly TABLE = 14;
    public static readonly STRUCT = 15;
    public static readonly ENUM = 16;
    public static readonly UNION = 17;
    public static readonly NAMESPACE = 18;
    public static readonly INCLUDE = 19;
    public static readonly NATIVE_INCLUDE = 20;
    public static readonly ATTRIBUTE = 21;
    public static readonly ROOT_TYPE = 22;
    public static readonly FILE_EXTENSION = 23;
    public static readonly FILE_IDENTIFIER = 24;
    public static readonly RPC_SERVICE = 25;
    public static readonly INT_LITERAL = 26;
    public static readonly HEX_FLOAT_LITERAL = 27;
    public static readonly FLOAT_LITERAL = 28;
    public static readonly STRING_LITERAL = 29;
    public static readonly IDENT = 30;
    public static readonly DOC_COMMENT = 31;
    public static readonly LINE_COMMENT = 32;
    public static readonly BLOCK_COMMENT = 33;
    public static readonly WS = 34;
    public static readonly RULE_schema = 0;
    public static readonly RULE_decl = 1;
    public static readonly RULE_includeDecl = 2;
    public static readonly RULE_namespaceDecl = 3;
    public static readonly RULE_attributeDecl = 4;
    public static readonly RULE_rootTypeDecl = 5;
    public static readonly RULE_fileExtensionDecl = 6;
    public static readonly RULE_fileIdentifierDecl = 7;
    public static readonly RULE_tableDecl = 8;
    public static readonly RULE_structDecl = 9;
    public static readonly RULE_fieldDecl = 10;
    public static readonly RULE_emptyVector = 11;
    public static readonly RULE_typeRef = 12;
    public static readonly RULE_nsIdent = 13;
    public static readonly RULE_enumDecl = 14;
    public static readonly RULE_enumValDecl = 15;
    public static readonly RULE_unionDecl = 16;
    public static readonly RULE_unionValDecl = 17;
    public static readonly RULE_rpcServiceDecl = 18;
    public static readonly RULE_rpcMethod = 19;
    public static readonly RULE_metadata = 20;
    public static readonly RULE_metadataEntry = 21;
    public static readonly RULE_singleValue = 22;
    public static readonly RULE_scalar = 23;
    public static readonly RULE_objectLiteralDecl = 24;
    public static readonly RULE_objectLiteral = 25;
    public static readonly RULE_objectField = 26;
    public static readonly RULE_objectValue = 27;
    public static readonly RULE_identifier = 28;
    public static readonly RULE_keywordAsIdent = 29;

    public static readonly literalNames = [
        null, "';'", "'.'", "'{'", "'}'", "':'", "'='", "'['", "']'", "','", 
        "'('", "')'", "'+'", "'-'", "'table'", "'struct'", "'enum'", "'union'", 
        "'namespace'", "'include'", "'native_include'", "'attribute'", "'root_type'", 
        "'file_extension'", "'file_identifier'", "'rpc_service'"
    ];

    public static readonly symbolicNames = [
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, "TABLE", "STRUCT", "ENUM", "UNION", "NAMESPACE", 
        "INCLUDE", "NATIVE_INCLUDE", "ATTRIBUTE", "ROOT_TYPE", "FILE_EXTENSION", 
        "FILE_IDENTIFIER", "RPC_SERVICE", "INT_LITERAL", "HEX_FLOAT_LITERAL", 
        "FLOAT_LITERAL", "STRING_LITERAL", "IDENT", "DOC_COMMENT", "LINE_COMMENT", 
        "BLOCK_COMMENT", "WS"
    ];
    public static readonly ruleNames = [
        "schema", "decl", "includeDecl", "namespaceDecl", "attributeDecl", 
        "rootTypeDecl", "fileExtensionDecl", "fileIdentifierDecl", "tableDecl", 
        "structDecl", "fieldDecl", "emptyVector", "typeRef", "nsIdent", 
        "enumDecl", "enumValDecl", "unionDecl", "unionValDecl", "rpcServiceDecl", 
        "rpcMethod", "metadata", "metadataEntry", "singleValue", "scalar", 
        "objectLiteralDecl", "objectLiteral", "objectField", "objectValue", 
        "identifier", "keywordAsIdent",
    ];

    public get grammarFileName(): string { return "FlatBuffers.g4"; }
    public get literalNames(): (string | null)[] { return FlatBuffersParser.literalNames; }
    public get symbolicNames(): (string | null)[] { return FlatBuffersParser.symbolicNames; }
    public get ruleNames(): string[] { return FlatBuffersParser.ruleNames; }
    public get serializedATN(): number[] { return FlatBuffersParser._serializedATN; }

    protected createFailedPredicateException(predicate?: string, message?: string): antlr.FailedPredicateException {
        return new antlr.FailedPredicateException(this, predicate, message);
    }

    public constructor(input: antlr.TokenStream) {
        super(input);
        this.interpreter = new antlr.ParserATNSimulator(this, FlatBuffersParser._ATN, FlatBuffersParser.decisionsToDFA, new antlr.PredictionContextCache());
    }
    public schema(): SchemaContext {
        let localContext = new SchemaContext(this.context, this.state);
        this.enterRule(localContext, 0, FlatBuffersParser.RULE_schema);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 63;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 67092488) !== 0)) {
                {
                {
                this.state = 60;
                this.decl();
                }
                }
                this.state = 65;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 66;
            this.match(FlatBuffersParser.EOF);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public decl(): DeclContext {
        let localContext = new DeclContext(this.context, this.state);
        this.enterRule(localContext, 2, FlatBuffersParser.RULE_decl);
        try {
            this.state = 80;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.INCLUDE:
            case FlatBuffersParser.NATIVE_INCLUDE:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 68;
                this.includeDecl();
                }
                break;
            case FlatBuffersParser.NAMESPACE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 69;
                this.namespaceDecl();
                }
                break;
            case FlatBuffersParser.ATTRIBUTE:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 70;
                this.attributeDecl();
                }
                break;
            case FlatBuffersParser.ROOT_TYPE:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 71;
                this.rootTypeDecl();
                }
                break;
            case FlatBuffersParser.FILE_EXTENSION:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 72;
                this.fileExtensionDecl();
                }
                break;
            case FlatBuffersParser.FILE_IDENTIFIER:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 73;
                this.fileIdentifierDecl();
                }
                break;
            case FlatBuffersParser.TABLE:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 74;
                this.tableDecl();
                }
                break;
            case FlatBuffersParser.STRUCT:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 75;
                this.structDecl();
                }
                break;
            case FlatBuffersParser.ENUM:
                this.enterOuterAlt(localContext, 9);
                {
                this.state = 76;
                this.enumDecl();
                }
                break;
            case FlatBuffersParser.UNION:
                this.enterOuterAlt(localContext, 10);
                {
                this.state = 77;
                this.unionDecl();
                }
                break;
            case FlatBuffersParser.RPC_SERVICE:
                this.enterOuterAlt(localContext, 11);
                {
                this.state = 78;
                this.rpcServiceDecl();
                }
                break;
            case FlatBuffersParser.T__2:
                this.enterOuterAlt(localContext, 12);
                {
                this.state = 79;
                this.objectLiteralDecl();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public includeDecl(): IncludeDeclContext {
        let localContext = new IncludeDeclContext(this.context, this.state);
        this.enterRule(localContext, 4, FlatBuffersParser.RULE_includeDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 82;
            _la = this.tokenStream.LA(1);
            if(!(_la === 19 || _la === 20)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 83;
            this.match(FlatBuffersParser.STRING_LITERAL);
            this.state = 84;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public namespaceDecl(): NamespaceDeclContext {
        let localContext = new NamespaceDeclContext(this.context, this.state);
        this.enterRule(localContext, 6, FlatBuffersParser.RULE_namespaceDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 86;
            this.match(FlatBuffersParser.NAMESPACE);
            this.state = 87;
            this.identifier();
            this.state = 92;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 2) {
                {
                {
                this.state = 88;
                this.match(FlatBuffersParser.T__1);
                this.state = 89;
                this.identifier();
                }
                }
                this.state = 94;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 95;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public attributeDecl(): AttributeDeclContext {
        let localContext = new AttributeDeclContext(this.context, this.state);
        this.enterRule(localContext, 8, FlatBuffersParser.RULE_attributeDecl);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 97;
            this.match(FlatBuffersParser.ATTRIBUTE);
            this.state = 100;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.STRING_LITERAL:
                {
                this.state = 98;
                this.match(FlatBuffersParser.STRING_LITERAL);
                }
                break;
            case FlatBuffersParser.TABLE:
            case FlatBuffersParser.STRUCT:
            case FlatBuffersParser.ENUM:
            case FlatBuffersParser.UNION:
            case FlatBuffersParser.NAMESPACE:
            case FlatBuffersParser.INCLUDE:
            case FlatBuffersParser.NATIVE_INCLUDE:
            case FlatBuffersParser.ATTRIBUTE:
            case FlatBuffersParser.ROOT_TYPE:
            case FlatBuffersParser.FILE_EXTENSION:
            case FlatBuffersParser.FILE_IDENTIFIER:
            case FlatBuffersParser.RPC_SERVICE:
            case FlatBuffersParser.IDENT:
                {
                this.state = 99;
                this.identifier();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            this.state = 102;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public rootTypeDecl(): RootTypeDeclContext {
        let localContext = new RootTypeDeclContext(this.context, this.state);
        this.enterRule(localContext, 10, FlatBuffersParser.RULE_rootTypeDecl);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 104;
            this.match(FlatBuffersParser.ROOT_TYPE);
            this.state = 105;
            this.nsIdent();
            this.state = 106;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public fileExtensionDecl(): FileExtensionDeclContext {
        let localContext = new FileExtensionDeclContext(this.context, this.state);
        this.enterRule(localContext, 12, FlatBuffersParser.RULE_fileExtensionDecl);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 108;
            this.match(FlatBuffersParser.FILE_EXTENSION);
            this.state = 109;
            this.match(FlatBuffersParser.STRING_LITERAL);
            this.state = 110;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public fileIdentifierDecl(): FileIdentifierDeclContext {
        let localContext = new FileIdentifierDeclContext(this.context, this.state);
        this.enterRule(localContext, 14, FlatBuffersParser.RULE_fileIdentifierDecl);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 112;
            this.match(FlatBuffersParser.FILE_IDENTIFIER);
            this.state = 113;
            this.match(FlatBuffersParser.STRING_LITERAL);
            this.state = 114;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public tableDecl(): TableDeclContext {
        let localContext = new TableDeclContext(this.context, this.state);
        this.enterRule(localContext, 16, FlatBuffersParser.RULE_tableDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 116;
            this.match(FlatBuffersParser.TABLE);
            this.state = 117;
            this.identifier();
            this.state = 119;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 118;
                this.metadata();
                }
            }

            this.state = 121;
            this.match(FlatBuffersParser.T__2);
            this.state = 125;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1140834304) !== 0)) {
                {
                {
                this.state = 122;
                this.fieldDecl();
                }
                }
                this.state = 127;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 128;
            this.match(FlatBuffersParser.T__3);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public structDecl(): StructDeclContext {
        let localContext = new StructDeclContext(this.context, this.state);
        this.enterRule(localContext, 18, FlatBuffersParser.RULE_structDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 130;
            this.match(FlatBuffersParser.STRUCT);
            this.state = 131;
            this.identifier();
            this.state = 133;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 132;
                this.metadata();
                }
            }

            this.state = 135;
            this.match(FlatBuffersParser.T__2);
            this.state = 139;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1140834304) !== 0)) {
                {
                {
                this.state = 136;
                this.fieldDecl();
                }
                }
                this.state = 141;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 142;
            this.match(FlatBuffersParser.T__3);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public fieldDecl(): FieldDeclContext {
        let localContext = new FieldDeclContext(this.context, this.state);
        this.enterRule(localContext, 20, FlatBuffersParser.RULE_fieldDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 144;
            this.identifier();
            this.state = 145;
            this.match(FlatBuffersParser.T__4);
            this.state = 146;
            this.typeRef();
            this.state = 152;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 6) {
                {
                this.state = 147;
                this.match(FlatBuffersParser.T__5);
                this.state = 150;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case FlatBuffersParser.T__11:
                case FlatBuffersParser.T__12:
                case FlatBuffersParser.TABLE:
                case FlatBuffersParser.STRUCT:
                case FlatBuffersParser.ENUM:
                case FlatBuffersParser.UNION:
                case FlatBuffersParser.NAMESPACE:
                case FlatBuffersParser.INCLUDE:
                case FlatBuffersParser.NATIVE_INCLUDE:
                case FlatBuffersParser.ATTRIBUTE:
                case FlatBuffersParser.ROOT_TYPE:
                case FlatBuffersParser.FILE_EXTENSION:
                case FlatBuffersParser.FILE_IDENTIFIER:
                case FlatBuffersParser.RPC_SERVICE:
                case FlatBuffersParser.INT_LITERAL:
                case FlatBuffersParser.HEX_FLOAT_LITERAL:
                case FlatBuffersParser.FLOAT_LITERAL:
                case FlatBuffersParser.STRING_LITERAL:
                case FlatBuffersParser.IDENT:
                    {
                    this.state = 148;
                    this.scalar();
                    }
                    break;
                case FlatBuffersParser.T__6:
                    {
                    this.state = 149;
                    this.emptyVector();
                    }
                    break;
                default:
                    throw new antlr.NoViableAltException(this);
                }
                }
            }

            this.state = 155;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 154;
                this.metadata();
                }
            }

            this.state = 157;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public emptyVector(): EmptyVectorContext {
        let localContext = new EmptyVectorContext(this.context, this.state);
        this.enterRule(localContext, 22, FlatBuffersParser.RULE_emptyVector);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 159;
            this.match(FlatBuffersParser.T__6);
            this.state = 160;
            this.match(FlatBuffersParser.T__7);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public typeRef(): TypeRefContext {
        let localContext = new TypeRefContext(this.context, this.state);
        this.enterRule(localContext, 24, FlatBuffersParser.RULE_typeRef);
        let _la: number;
        try {
            this.state = 171;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.T__6:
                localContext = new VectorTypeContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 162;
                this.match(FlatBuffersParser.T__6);
                this.state = 163;
                this.typeRef();
                this.state = 166;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 5) {
                    {
                    this.state = 164;
                    this.match(FlatBuffersParser.T__4);
                    this.state = 165;
                    this.match(FlatBuffersParser.INT_LITERAL);
                    }
                }

                this.state = 168;
                this.match(FlatBuffersParser.T__7);
                }
                break;
            case FlatBuffersParser.TABLE:
            case FlatBuffersParser.STRUCT:
            case FlatBuffersParser.ENUM:
            case FlatBuffersParser.UNION:
            case FlatBuffersParser.NAMESPACE:
            case FlatBuffersParser.INCLUDE:
            case FlatBuffersParser.NATIVE_INCLUDE:
            case FlatBuffersParser.ATTRIBUTE:
            case FlatBuffersParser.ROOT_TYPE:
            case FlatBuffersParser.FILE_EXTENSION:
            case FlatBuffersParser.FILE_IDENTIFIER:
            case FlatBuffersParser.RPC_SERVICE:
            case FlatBuffersParser.IDENT:
                localContext = new NamedTypeContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 170;
                this.nsIdent();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public nsIdent(): NsIdentContext {
        let localContext = new NsIdentContext(this.context, this.state);
        this.enterRule(localContext, 26, FlatBuffersParser.RULE_nsIdent);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 173;
            this.identifier();
            this.state = 178;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 2) {
                {
                {
                this.state = 174;
                this.match(FlatBuffersParser.T__1);
                this.state = 175;
                this.identifier();
                }
                }
                this.state = 180;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public enumDecl(): EnumDeclContext {
        let localContext = new EnumDeclContext(this.context, this.state);
        this.enterRule(localContext, 28, FlatBuffersParser.RULE_enumDecl);
        let _la: number;
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 181;
            this.match(FlatBuffersParser.ENUM);
            this.state = 182;
            this.identifier();
            this.state = 185;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 5) {
                {
                this.state = 183;
                this.match(FlatBuffersParser.T__4);
                this.state = 184;
                this.identifier();
                }
            }

            this.state = 188;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 187;
                this.metadata();
                }
            }

            this.state = 190;
            this.match(FlatBuffersParser.T__2);
            this.state = 202;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1140834304) !== 0)) {
                {
                this.state = 191;
                this.enumValDecl();
                this.state = 196;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 16, this.context);
                while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                    if (alternative === 1) {
                        {
                        {
                        this.state = 192;
                        this.match(FlatBuffersParser.T__8);
                        this.state = 193;
                        this.enumValDecl();
                        }
                        }
                    }
                    this.state = 198;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 16, this.context);
                }
                this.state = 200;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 9) {
                    {
                    this.state = 199;
                    this.match(FlatBuffersParser.T__8);
                    }
                }

                }
            }

            this.state = 204;
            this.match(FlatBuffersParser.T__3);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public enumValDecl(): EnumValDeclContext {
        let localContext = new EnumValDeclContext(this.context, this.state);
        this.enterRule(localContext, 30, FlatBuffersParser.RULE_enumValDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 206;
            this.identifier();
            this.state = 209;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 6) {
                {
                this.state = 207;
                this.match(FlatBuffersParser.T__5);
                this.state = 208;
                this.scalar();
                }
            }

            this.state = 212;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 211;
                this.metadata();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public unionDecl(): UnionDeclContext {
        let localContext = new UnionDeclContext(this.context, this.state);
        this.enterRule(localContext, 32, FlatBuffersParser.RULE_unionDecl);
        let _la: number;
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 214;
            this.match(FlatBuffersParser.UNION);
            this.state = 215;
            this.identifier();
            this.state = 218;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 5) {
                {
                this.state = 216;
                this.match(FlatBuffersParser.T__4);
                this.state = 217;
                this.identifier();
                }
            }

            this.state = 221;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 220;
                this.metadata();
                }
            }

            this.state = 223;
            this.match(FlatBuffersParser.T__2);
            this.state = 235;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1140834304) !== 0)) {
                {
                this.state = 224;
                this.unionValDecl();
                this.state = 229;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 23, this.context);
                while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                    if (alternative === 1) {
                        {
                        {
                        this.state = 225;
                        this.match(FlatBuffersParser.T__8);
                        this.state = 226;
                        this.unionValDecl();
                        }
                        }
                    }
                    this.state = 231;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 23, this.context);
                }
                this.state = 233;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 9) {
                    {
                    this.state = 232;
                    this.match(FlatBuffersParser.T__8);
                    }
                }

                }
            }

            this.state = 237;
            this.match(FlatBuffersParser.T__3);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public unionValDecl(): UnionValDeclContext {
        let localContext = new UnionValDeclContext(this.context, this.state);
        this.enterRule(localContext, 34, FlatBuffersParser.RULE_unionValDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 242;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 26, this.context) ) {
            case 1:
                {
                this.state = 239;
                this.identifier();
                this.state = 240;
                this.match(FlatBuffersParser.T__4);
                }
                break;
            }
            this.state = 244;
            this.nsIdent();
            this.state = 247;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 6) {
                {
                this.state = 245;
                this.match(FlatBuffersParser.T__5);
                this.state = 246;
                this.scalar();
                }
            }

            this.state = 250;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 249;
                this.metadata();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public rpcServiceDecl(): RpcServiceDeclContext {
        let localContext = new RpcServiceDeclContext(this.context, this.state);
        this.enterRule(localContext, 36, FlatBuffersParser.RULE_rpcServiceDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 252;
            this.match(FlatBuffersParser.RPC_SERVICE);
            this.state = 253;
            this.identifier();
            this.state = 254;
            this.match(FlatBuffersParser.T__2);
            this.state = 258;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1140834304) !== 0)) {
                {
                {
                this.state = 255;
                this.rpcMethod();
                }
                }
                this.state = 260;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 261;
            this.match(FlatBuffersParser.T__3);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public rpcMethod(): RpcMethodContext {
        let localContext = new RpcMethodContext(this.context, this.state);
        this.enterRule(localContext, 38, FlatBuffersParser.RULE_rpcMethod);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 263;
            this.identifier();
            this.state = 264;
            this.match(FlatBuffersParser.T__9);
            this.state = 265;
            this.nsIdent();
            this.state = 266;
            this.match(FlatBuffersParser.T__10);
            this.state = 267;
            this.match(FlatBuffersParser.T__4);
            this.state = 268;
            this.nsIdent();
            this.state = 270;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 10) {
                {
                this.state = 269;
                this.metadata();
                }
            }

            this.state = 272;
            this.match(FlatBuffersParser.T__0);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public metadata(): MetadataContext {
        let localContext = new MetadataContext(this.context, this.state);
        this.enterRule(localContext, 40, FlatBuffersParser.RULE_metadata);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 274;
            this.match(FlatBuffersParser.T__9);
            this.state = 283;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1140834304) !== 0)) {
                {
                this.state = 275;
                this.metadataEntry();
                this.state = 280;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 9) {
                    {
                    {
                    this.state = 276;
                    this.match(FlatBuffersParser.T__8);
                    this.state = 277;
                    this.metadataEntry();
                    }
                    }
                    this.state = 282;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
            }

            this.state = 285;
            this.match(FlatBuffersParser.T__10);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public metadataEntry(): MetadataEntryContext {
        let localContext = new MetadataEntryContext(this.context, this.state);
        this.enterRule(localContext, 42, FlatBuffersParser.RULE_metadataEntry);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 287;
            this.identifier();
            this.state = 290;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 5) {
                {
                this.state = 288;
                this.match(FlatBuffersParser.T__4);
                this.state = 289;
                this.singleValue();
                }
            }

            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public singleValue(): SingleValueContext {
        let localContext = new SingleValueContext(this.context, this.state);
        this.enterRule(localContext, 44, FlatBuffersParser.RULE_singleValue);
        try {
            this.state = 294;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 34, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 292;
                this.scalar();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 293;
                this.match(FlatBuffersParser.STRING_LITERAL);
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public scalar(): ScalarContext {
        let localContext = new ScalarContext(this.context, this.state);
        this.enterRule(localContext, 46, FlatBuffersParser.RULE_scalar);
        let _la: number;
        try {
            this.state = 313;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 39, this.context) ) {
            case 1:
                localContext = new IntScalarContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 297;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 12 || _la === 13) {
                    {
                    this.state = 296;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 12 || _la === 13)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 299;
                this.match(FlatBuffersParser.INT_LITERAL);
                }
                break;
            case 2:
                localContext = new FloatScalarContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 301;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 12 || _la === 13) {
                    {
                    this.state = 300;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 12 || _la === 13)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 303;
                this.match(FlatBuffersParser.FLOAT_LITERAL);
                }
                break;
            case 3:
                localContext = new HexFloatScalarContext(localContext);
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 305;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 12 || _la === 13) {
                    {
                    this.state = 304;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 12 || _la === 13)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 307;
                this.match(FlatBuffersParser.HEX_FLOAT_LITERAL);
                }
                break;
            case 4:
                localContext = new StringScalarContext(localContext);
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 308;
                this.match(FlatBuffersParser.STRING_LITERAL);
                }
                break;
            case 5:
                localContext = new IdentScalarContext(localContext);
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 310;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 12 || _la === 13) {
                    {
                    this.state = 309;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 12 || _la === 13)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 312;
                this.identifier();
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public objectLiteralDecl(): ObjectLiteralDeclContext {
        let localContext = new ObjectLiteralDeclContext(this.context, this.state);
        this.enterRule(localContext, 48, FlatBuffersParser.RULE_objectLiteralDecl);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 315;
            this.objectLiteral();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public objectLiteral(): ObjectLiteralContext {
        let localContext = new ObjectLiteralContext(this.context, this.state);
        this.enterRule(localContext, 50, FlatBuffersParser.RULE_objectLiteral);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 317;
            this.match(FlatBuffersParser.T__2);
            this.state = 326;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1677705216) !== 0)) {
                {
                this.state = 318;
                this.objectField();
                this.state = 323;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 9) {
                    {
                    {
                    this.state = 319;
                    this.match(FlatBuffersParser.T__8);
                    this.state = 320;
                    this.objectField();
                    }
                    }
                    this.state = 325;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
            }

            this.state = 328;
            this.match(FlatBuffersParser.T__3);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public objectField(): ObjectFieldContext {
        let localContext = new ObjectFieldContext(this.context, this.state);
        this.enterRule(localContext, 52, FlatBuffersParser.RULE_objectField);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 332;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.TABLE:
            case FlatBuffersParser.STRUCT:
            case FlatBuffersParser.ENUM:
            case FlatBuffersParser.UNION:
            case FlatBuffersParser.NAMESPACE:
            case FlatBuffersParser.INCLUDE:
            case FlatBuffersParser.NATIVE_INCLUDE:
            case FlatBuffersParser.ATTRIBUTE:
            case FlatBuffersParser.ROOT_TYPE:
            case FlatBuffersParser.FILE_EXTENSION:
            case FlatBuffersParser.FILE_IDENTIFIER:
            case FlatBuffersParser.RPC_SERVICE:
            case FlatBuffersParser.IDENT:
                {
                this.state = 330;
                this.identifier();
                }
                break;
            case FlatBuffersParser.STRING_LITERAL:
                {
                this.state = 331;
                this.match(FlatBuffersParser.STRING_LITERAL);
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
            this.state = 334;
            this.match(FlatBuffersParser.T__4);
            this.state = 335;
            this.objectValue();
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public objectValue(): ObjectValueContext {
        let localContext = new ObjectValueContext(this.context, this.state);
        this.enterRule(localContext, 54, FlatBuffersParser.RULE_objectValue);
        let _la: number;
        try {
            this.state = 351;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.T__11:
            case FlatBuffersParser.T__12:
            case FlatBuffersParser.TABLE:
            case FlatBuffersParser.STRUCT:
            case FlatBuffersParser.ENUM:
            case FlatBuffersParser.UNION:
            case FlatBuffersParser.NAMESPACE:
            case FlatBuffersParser.INCLUDE:
            case FlatBuffersParser.NATIVE_INCLUDE:
            case FlatBuffersParser.ATTRIBUTE:
            case FlatBuffersParser.ROOT_TYPE:
            case FlatBuffersParser.FILE_EXTENSION:
            case FlatBuffersParser.FILE_IDENTIFIER:
            case FlatBuffersParser.RPC_SERVICE:
            case FlatBuffersParser.INT_LITERAL:
            case FlatBuffersParser.HEX_FLOAT_LITERAL:
            case FlatBuffersParser.FLOAT_LITERAL:
            case FlatBuffersParser.STRING_LITERAL:
            case FlatBuffersParser.IDENT:
                localContext = new ScalarValueContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 337;
                this.scalar();
                }
                break;
            case FlatBuffersParser.T__2:
                localContext = new NestedObjectValueContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 338;
                this.objectLiteral();
                }
                break;
            case FlatBuffersParser.T__6:
                localContext = new ArrayValueContext(localContext);
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 339;
                this.match(FlatBuffersParser.T__6);
                this.state = 348;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 2147479688) !== 0)) {
                    {
                    this.state = 340;
                    this.objectValue();
                    this.state = 345;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                    while (_la === 9) {
                        {
                        {
                        this.state = 341;
                        this.match(FlatBuffersParser.T__8);
                        this.state = 342;
                        this.objectValue();
                        }
                        }
                        this.state = 347;
                        this.errorHandler.sync(this);
                        _la = this.tokenStream.LA(1);
                    }
                    }
                }

                this.state = 350;
                this.match(FlatBuffersParser.T__7);
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public identifier(): IdentifierContext {
        let localContext = new IdentifierContext(this.context, this.state);
        this.enterRule(localContext, 56, FlatBuffersParser.RULE_identifier);
        try {
            this.state = 355;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.IDENT:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 353;
                this.match(FlatBuffersParser.IDENT);
                }
                break;
            case FlatBuffersParser.TABLE:
            case FlatBuffersParser.STRUCT:
            case FlatBuffersParser.ENUM:
            case FlatBuffersParser.UNION:
            case FlatBuffersParser.NAMESPACE:
            case FlatBuffersParser.INCLUDE:
            case FlatBuffersParser.NATIVE_INCLUDE:
            case FlatBuffersParser.ATTRIBUTE:
            case FlatBuffersParser.ROOT_TYPE:
            case FlatBuffersParser.FILE_EXTENSION:
            case FlatBuffersParser.FILE_IDENTIFIER:
            case FlatBuffersParser.RPC_SERVICE:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 354;
                this.keywordAsIdent();
                }
                break;
            default:
                throw new antlr.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public keywordAsIdent(): KeywordAsIdentContext {
        let localContext = new KeywordAsIdentContext(this.context, this.state);
        this.enterRule(localContext, 58, FlatBuffersParser.RULE_keywordAsIdent);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 357;
            _la = this.tokenStream.LA(1);
            if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 67092480) !== 0))) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }

    public static readonly _serializedATN: number[] = [
        4,1,34,360,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,
        6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,
        2,14,7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,2,20,
        7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,24,2,25,7,25,2,26,7,26,
        2,27,7,27,2,28,7,28,2,29,7,29,1,0,5,0,62,8,0,10,0,12,0,65,9,0,1,
        0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,81,8,1,
        1,2,1,2,1,2,1,2,1,3,1,3,1,3,1,3,5,3,91,8,3,10,3,12,3,94,9,3,1,3,
        1,3,1,4,1,4,1,4,3,4,101,8,4,1,4,1,4,1,5,1,5,1,5,1,5,1,6,1,6,1,6,
        1,6,1,7,1,7,1,7,1,7,1,8,1,8,1,8,3,8,120,8,8,1,8,1,8,5,8,124,8,8,
        10,8,12,8,127,9,8,1,8,1,8,1,9,1,9,1,9,3,9,134,8,9,1,9,1,9,5,9,138,
        8,9,10,9,12,9,141,9,9,1,9,1,9,1,10,1,10,1,10,1,10,1,10,1,10,3,10,
        151,8,10,3,10,153,8,10,1,10,3,10,156,8,10,1,10,1,10,1,11,1,11,1,
        11,1,12,1,12,1,12,1,12,3,12,167,8,12,1,12,1,12,1,12,3,12,172,8,12,
        1,13,1,13,1,13,5,13,177,8,13,10,13,12,13,180,9,13,1,14,1,14,1,14,
        1,14,3,14,186,8,14,1,14,3,14,189,8,14,1,14,1,14,1,14,1,14,5,14,195,
        8,14,10,14,12,14,198,9,14,1,14,3,14,201,8,14,3,14,203,8,14,1,14,
        1,14,1,15,1,15,1,15,3,15,210,8,15,1,15,3,15,213,8,15,1,16,1,16,1,
        16,1,16,3,16,219,8,16,1,16,3,16,222,8,16,1,16,1,16,1,16,1,16,5,16,
        228,8,16,10,16,12,16,231,9,16,1,16,3,16,234,8,16,3,16,236,8,16,1,
        16,1,16,1,17,1,17,1,17,3,17,243,8,17,1,17,1,17,1,17,3,17,248,8,17,
        1,17,3,17,251,8,17,1,18,1,18,1,18,1,18,5,18,257,8,18,10,18,12,18,
        260,9,18,1,18,1,18,1,19,1,19,1,19,1,19,1,19,1,19,1,19,3,19,271,8,
        19,1,19,1,19,1,20,1,20,1,20,1,20,5,20,279,8,20,10,20,12,20,282,9,
        20,3,20,284,8,20,1,20,1,20,1,21,1,21,1,21,3,21,291,8,21,1,22,1,22,
        3,22,295,8,22,1,23,3,23,298,8,23,1,23,1,23,3,23,302,8,23,1,23,1,
        23,3,23,306,8,23,1,23,1,23,1,23,3,23,311,8,23,1,23,3,23,314,8,23,
        1,24,1,24,1,25,1,25,1,25,1,25,5,25,322,8,25,10,25,12,25,325,9,25,
        3,25,327,8,25,1,25,1,25,1,26,1,26,3,26,333,8,26,1,26,1,26,1,26,1,
        27,1,27,1,27,1,27,1,27,1,27,5,27,344,8,27,10,27,12,27,347,9,27,3,
        27,349,8,27,1,27,3,27,352,8,27,1,28,1,28,3,28,356,8,28,1,29,1,29,
        1,29,0,0,30,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,
        38,40,42,44,46,48,50,52,54,56,58,0,3,1,0,19,20,1,0,12,13,1,0,14,
        25,390,0,63,1,0,0,0,2,80,1,0,0,0,4,82,1,0,0,0,6,86,1,0,0,0,8,97,
        1,0,0,0,10,104,1,0,0,0,12,108,1,0,0,0,14,112,1,0,0,0,16,116,1,0,
        0,0,18,130,1,0,0,0,20,144,1,0,0,0,22,159,1,0,0,0,24,171,1,0,0,0,
        26,173,1,0,0,0,28,181,1,0,0,0,30,206,1,0,0,0,32,214,1,0,0,0,34,242,
        1,0,0,0,36,252,1,0,0,0,38,263,1,0,0,0,40,274,1,0,0,0,42,287,1,0,
        0,0,44,294,1,0,0,0,46,313,1,0,0,0,48,315,1,0,0,0,50,317,1,0,0,0,
        52,332,1,0,0,0,54,351,1,0,0,0,56,355,1,0,0,0,58,357,1,0,0,0,60,62,
        3,2,1,0,61,60,1,0,0,0,62,65,1,0,0,0,63,61,1,0,0,0,63,64,1,0,0,0,
        64,66,1,0,0,0,65,63,1,0,0,0,66,67,5,0,0,1,67,1,1,0,0,0,68,81,3,4,
        2,0,69,81,3,6,3,0,70,81,3,8,4,0,71,81,3,10,5,0,72,81,3,12,6,0,73,
        81,3,14,7,0,74,81,3,16,8,0,75,81,3,18,9,0,76,81,3,28,14,0,77,81,
        3,32,16,0,78,81,3,36,18,0,79,81,3,48,24,0,80,68,1,0,0,0,80,69,1,
        0,0,0,80,70,1,0,0,0,80,71,1,0,0,0,80,72,1,0,0,0,80,73,1,0,0,0,80,
        74,1,0,0,0,80,75,1,0,0,0,80,76,1,0,0,0,80,77,1,0,0,0,80,78,1,0,0,
        0,80,79,1,0,0,0,81,3,1,0,0,0,82,83,7,0,0,0,83,84,5,29,0,0,84,85,
        5,1,0,0,85,5,1,0,0,0,86,87,5,18,0,0,87,92,3,56,28,0,88,89,5,2,0,
        0,89,91,3,56,28,0,90,88,1,0,0,0,91,94,1,0,0,0,92,90,1,0,0,0,92,93,
        1,0,0,0,93,95,1,0,0,0,94,92,1,0,0,0,95,96,5,1,0,0,96,7,1,0,0,0,97,
        100,5,21,0,0,98,101,5,29,0,0,99,101,3,56,28,0,100,98,1,0,0,0,100,
        99,1,0,0,0,101,102,1,0,0,0,102,103,5,1,0,0,103,9,1,0,0,0,104,105,
        5,22,0,0,105,106,3,26,13,0,106,107,5,1,0,0,107,11,1,0,0,0,108,109,
        5,23,0,0,109,110,5,29,0,0,110,111,5,1,0,0,111,13,1,0,0,0,112,113,
        5,24,0,0,113,114,5,29,0,0,114,115,5,1,0,0,115,15,1,0,0,0,116,117,
        5,14,0,0,117,119,3,56,28,0,118,120,3,40,20,0,119,118,1,0,0,0,119,
        120,1,0,0,0,120,121,1,0,0,0,121,125,5,3,0,0,122,124,3,20,10,0,123,
        122,1,0,0,0,124,127,1,0,0,0,125,123,1,0,0,0,125,126,1,0,0,0,126,
        128,1,0,0,0,127,125,1,0,0,0,128,129,5,4,0,0,129,17,1,0,0,0,130,131,
        5,15,0,0,131,133,3,56,28,0,132,134,3,40,20,0,133,132,1,0,0,0,133,
        134,1,0,0,0,134,135,1,0,0,0,135,139,5,3,0,0,136,138,3,20,10,0,137,
        136,1,0,0,0,138,141,1,0,0,0,139,137,1,0,0,0,139,140,1,0,0,0,140,
        142,1,0,0,0,141,139,1,0,0,0,142,143,5,4,0,0,143,19,1,0,0,0,144,145,
        3,56,28,0,145,146,5,5,0,0,146,152,3,24,12,0,147,150,5,6,0,0,148,
        151,3,46,23,0,149,151,3,22,11,0,150,148,1,0,0,0,150,149,1,0,0,0,
        151,153,1,0,0,0,152,147,1,0,0,0,152,153,1,0,0,0,153,155,1,0,0,0,
        154,156,3,40,20,0,155,154,1,0,0,0,155,156,1,0,0,0,156,157,1,0,0,
        0,157,158,5,1,0,0,158,21,1,0,0,0,159,160,5,7,0,0,160,161,5,8,0,0,
        161,23,1,0,0,0,162,163,5,7,0,0,163,166,3,24,12,0,164,165,5,5,0,0,
        165,167,5,26,0,0,166,164,1,0,0,0,166,167,1,0,0,0,167,168,1,0,0,0,
        168,169,5,8,0,0,169,172,1,0,0,0,170,172,3,26,13,0,171,162,1,0,0,
        0,171,170,1,0,0,0,172,25,1,0,0,0,173,178,3,56,28,0,174,175,5,2,0,
        0,175,177,3,56,28,0,176,174,1,0,0,0,177,180,1,0,0,0,178,176,1,0,
        0,0,178,179,1,0,0,0,179,27,1,0,0,0,180,178,1,0,0,0,181,182,5,16,
        0,0,182,185,3,56,28,0,183,184,5,5,0,0,184,186,3,56,28,0,185,183,
        1,0,0,0,185,186,1,0,0,0,186,188,1,0,0,0,187,189,3,40,20,0,188,187,
        1,0,0,0,188,189,1,0,0,0,189,190,1,0,0,0,190,202,5,3,0,0,191,196,
        3,30,15,0,192,193,5,9,0,0,193,195,3,30,15,0,194,192,1,0,0,0,195,
        198,1,0,0,0,196,194,1,0,0,0,196,197,1,0,0,0,197,200,1,0,0,0,198,
        196,1,0,0,0,199,201,5,9,0,0,200,199,1,0,0,0,200,201,1,0,0,0,201,
        203,1,0,0,0,202,191,1,0,0,0,202,203,1,0,0,0,203,204,1,0,0,0,204,
        205,5,4,0,0,205,29,1,0,0,0,206,209,3,56,28,0,207,208,5,6,0,0,208,
        210,3,46,23,0,209,207,1,0,0,0,209,210,1,0,0,0,210,212,1,0,0,0,211,
        213,3,40,20,0,212,211,1,0,0,0,212,213,1,0,0,0,213,31,1,0,0,0,214,
        215,5,17,0,0,215,218,3,56,28,0,216,217,5,5,0,0,217,219,3,56,28,0,
        218,216,1,0,0,0,218,219,1,0,0,0,219,221,1,0,0,0,220,222,3,40,20,
        0,221,220,1,0,0,0,221,222,1,0,0,0,222,223,1,0,0,0,223,235,5,3,0,
        0,224,229,3,34,17,0,225,226,5,9,0,0,226,228,3,34,17,0,227,225,1,
        0,0,0,228,231,1,0,0,0,229,227,1,0,0,0,229,230,1,0,0,0,230,233,1,
        0,0,0,231,229,1,0,0,0,232,234,5,9,0,0,233,232,1,0,0,0,233,234,1,
        0,0,0,234,236,1,0,0,0,235,224,1,0,0,0,235,236,1,0,0,0,236,237,1,
        0,0,0,237,238,5,4,0,0,238,33,1,0,0,0,239,240,3,56,28,0,240,241,5,
        5,0,0,241,243,1,0,0,0,242,239,1,0,0,0,242,243,1,0,0,0,243,244,1,
        0,0,0,244,247,3,26,13,0,245,246,5,6,0,0,246,248,3,46,23,0,247,245,
        1,0,0,0,247,248,1,0,0,0,248,250,1,0,0,0,249,251,3,40,20,0,250,249,
        1,0,0,0,250,251,1,0,0,0,251,35,1,0,0,0,252,253,5,25,0,0,253,254,
        3,56,28,0,254,258,5,3,0,0,255,257,3,38,19,0,256,255,1,0,0,0,257,
        260,1,0,0,0,258,256,1,0,0,0,258,259,1,0,0,0,259,261,1,0,0,0,260,
        258,1,0,0,0,261,262,5,4,0,0,262,37,1,0,0,0,263,264,3,56,28,0,264,
        265,5,10,0,0,265,266,3,26,13,0,266,267,5,11,0,0,267,268,5,5,0,0,
        268,270,3,26,13,0,269,271,3,40,20,0,270,269,1,0,0,0,270,271,1,0,
        0,0,271,272,1,0,0,0,272,273,5,1,0,0,273,39,1,0,0,0,274,283,5,10,
        0,0,275,280,3,42,21,0,276,277,5,9,0,0,277,279,3,42,21,0,278,276,
        1,0,0,0,279,282,1,0,0,0,280,278,1,0,0,0,280,281,1,0,0,0,281,284,
        1,0,0,0,282,280,1,0,0,0,283,275,1,0,0,0,283,284,1,0,0,0,284,285,
        1,0,0,0,285,286,5,11,0,0,286,41,1,0,0,0,287,290,3,56,28,0,288,289,
        5,5,0,0,289,291,3,44,22,0,290,288,1,0,0,0,290,291,1,0,0,0,291,43,
        1,0,0,0,292,295,3,46,23,0,293,295,5,29,0,0,294,292,1,0,0,0,294,293,
        1,0,0,0,295,45,1,0,0,0,296,298,7,1,0,0,297,296,1,0,0,0,297,298,1,
        0,0,0,298,299,1,0,0,0,299,314,5,26,0,0,300,302,7,1,0,0,301,300,1,
        0,0,0,301,302,1,0,0,0,302,303,1,0,0,0,303,314,5,28,0,0,304,306,7,
        1,0,0,305,304,1,0,0,0,305,306,1,0,0,0,306,307,1,0,0,0,307,314,5,
        27,0,0,308,314,5,29,0,0,309,311,7,1,0,0,310,309,1,0,0,0,310,311,
        1,0,0,0,311,312,1,0,0,0,312,314,3,56,28,0,313,297,1,0,0,0,313,301,
        1,0,0,0,313,305,1,0,0,0,313,308,1,0,0,0,313,310,1,0,0,0,314,47,1,
        0,0,0,315,316,3,50,25,0,316,49,1,0,0,0,317,326,5,3,0,0,318,323,3,
        52,26,0,319,320,5,9,0,0,320,322,3,52,26,0,321,319,1,0,0,0,322,325,
        1,0,0,0,323,321,1,0,0,0,323,324,1,0,0,0,324,327,1,0,0,0,325,323,
        1,0,0,0,326,318,1,0,0,0,326,327,1,0,0,0,327,328,1,0,0,0,328,329,
        5,4,0,0,329,51,1,0,0,0,330,333,3,56,28,0,331,333,5,29,0,0,332,330,
        1,0,0,0,332,331,1,0,0,0,333,334,1,0,0,0,334,335,5,5,0,0,335,336,
        3,54,27,0,336,53,1,0,0,0,337,352,3,46,23,0,338,352,3,50,25,0,339,
        348,5,7,0,0,340,345,3,54,27,0,341,342,5,9,0,0,342,344,3,54,27,0,
        343,341,1,0,0,0,344,347,1,0,0,0,345,343,1,0,0,0,345,346,1,0,0,0,
        346,349,1,0,0,0,347,345,1,0,0,0,348,340,1,0,0,0,348,349,1,0,0,0,
        349,350,1,0,0,0,350,352,5,8,0,0,351,337,1,0,0,0,351,338,1,0,0,0,
        351,339,1,0,0,0,352,55,1,0,0,0,353,356,5,30,0,0,354,356,3,58,29,
        0,355,353,1,0,0,0,355,354,1,0,0,0,356,57,1,0,0,0,357,358,7,2,0,0,
        358,59,1,0,0,0,47,63,80,92,100,119,125,133,139,150,152,155,166,171,
        178,185,188,196,200,202,209,212,218,221,229,233,235,242,247,250,
        258,270,280,283,290,294,297,301,305,310,313,323,326,332,345,348,
        351,355
    ];

    private static __ATN: antlr.ATN;
    public static get _ATN(): antlr.ATN {
        if (!FlatBuffersParser.__ATN) {
            FlatBuffersParser.__ATN = new antlr.ATNDeserializer().deserialize(FlatBuffersParser._serializedATN);
        }

        return FlatBuffersParser.__ATN;
    }


    private static readonly vocabulary = new antlr.Vocabulary(FlatBuffersParser.literalNames, FlatBuffersParser.symbolicNames, []);

    public override get vocabulary(): antlr.Vocabulary {
        return FlatBuffersParser.vocabulary;
    }

    private static readonly decisionsToDFA = FlatBuffersParser._ATN.decisionToState.map( (ds: antlr.DecisionState, index: number) => new antlr.DFA(ds, index) );
}

export class SchemaContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public EOF(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.EOF, 0)!;
    }
    public decl(): DeclContext[];
    public decl(i: number): DeclContext | null;
    public decl(i?: number): DeclContext[] | DeclContext | null {
        if (i === undefined) {
            return this.getRuleContexts(DeclContext);
        }

        return this.getRuleContext(i, DeclContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_schema;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterSchema) {
             listener.enterSchema(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitSchema) {
             listener.exitSchema(this);
        }
    }
}


export class DeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public includeDecl(): IncludeDeclContext | null {
        return this.getRuleContext(0, IncludeDeclContext);
    }
    public namespaceDecl(): NamespaceDeclContext | null {
        return this.getRuleContext(0, NamespaceDeclContext);
    }
    public attributeDecl(): AttributeDeclContext | null {
        return this.getRuleContext(0, AttributeDeclContext);
    }
    public rootTypeDecl(): RootTypeDeclContext | null {
        return this.getRuleContext(0, RootTypeDeclContext);
    }
    public fileExtensionDecl(): FileExtensionDeclContext | null {
        return this.getRuleContext(0, FileExtensionDeclContext);
    }
    public fileIdentifierDecl(): FileIdentifierDeclContext | null {
        return this.getRuleContext(0, FileIdentifierDeclContext);
    }
    public tableDecl(): TableDeclContext | null {
        return this.getRuleContext(0, TableDeclContext);
    }
    public structDecl(): StructDeclContext | null {
        return this.getRuleContext(0, StructDeclContext);
    }
    public enumDecl(): EnumDeclContext | null {
        return this.getRuleContext(0, EnumDeclContext);
    }
    public unionDecl(): UnionDeclContext | null {
        return this.getRuleContext(0, UnionDeclContext);
    }
    public rpcServiceDecl(): RpcServiceDeclContext | null {
        return this.getRuleContext(0, RpcServiceDeclContext);
    }
    public objectLiteralDecl(): ObjectLiteralDeclContext | null {
        return this.getRuleContext(0, ObjectLiteralDeclContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_decl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterDecl) {
             listener.enterDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitDecl) {
             listener.exitDecl(this);
        }
    }
}


export class IncludeDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0)!;
    }
    public INCLUDE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.INCLUDE, 0);
    }
    public NATIVE_INCLUDE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.NATIVE_INCLUDE, 0);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_includeDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterIncludeDecl) {
             listener.enterIncludeDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitIncludeDecl) {
             listener.exitIncludeDecl(this);
        }
    }
}


export class NamespaceDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public NAMESPACE(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.NAMESPACE, 0)!;
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_namespaceDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterNamespaceDecl) {
             listener.enterNamespaceDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitNamespaceDecl) {
             listener.exitNamespaceDecl(this);
        }
    }
}


export class AttributeDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ATTRIBUTE(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.ATTRIBUTE, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0);
    }
    public identifier(): IdentifierContext | null {
        return this.getRuleContext(0, IdentifierContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_attributeDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterAttributeDecl) {
             listener.enterAttributeDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitAttributeDecl) {
             listener.exitAttributeDecl(this);
        }
    }
}


export class RootTypeDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ROOT_TYPE(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.ROOT_TYPE, 0)!;
    }
    public nsIdent(): NsIdentContext {
        return this.getRuleContext(0, NsIdentContext)!;
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_rootTypeDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterRootTypeDecl) {
             listener.enterRootTypeDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitRootTypeDecl) {
             listener.exitRootTypeDecl(this);
        }
    }
}


export class FileExtensionDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FILE_EXTENSION(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.FILE_EXTENSION, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0)!;
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_fileExtensionDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterFileExtensionDecl) {
             listener.enterFileExtensionDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitFileExtensionDecl) {
             listener.exitFileExtensionDecl(this);
        }
    }
}


export class FileIdentifierDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public FILE_IDENTIFIER(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.FILE_IDENTIFIER, 0)!;
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0)!;
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_fileIdentifierDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterFileIdentifierDecl) {
             listener.enterFileIdentifierDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitFileIdentifierDecl) {
             listener.exitFileIdentifierDecl(this);
        }
    }
}


export class TableDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TABLE(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.TABLE, 0)!;
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public fieldDecl(): FieldDeclContext[];
    public fieldDecl(i: number): FieldDeclContext | null;
    public fieldDecl(i?: number): FieldDeclContext[] | FieldDeclContext | null {
        if (i === undefined) {
            return this.getRuleContexts(FieldDeclContext);
        }

        return this.getRuleContext(i, FieldDeclContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_tableDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterTableDecl) {
             listener.enterTableDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitTableDecl) {
             listener.exitTableDecl(this);
        }
    }
}


export class StructDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public STRUCT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.STRUCT, 0)!;
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public fieldDecl(): FieldDeclContext[];
    public fieldDecl(i: number): FieldDeclContext | null;
    public fieldDecl(i?: number): FieldDeclContext[] | FieldDeclContext | null {
        if (i === undefined) {
            return this.getRuleContexts(FieldDeclContext);
        }

        return this.getRuleContext(i, FieldDeclContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_structDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterStructDecl) {
             listener.enterStructDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitStructDecl) {
             listener.exitStructDecl(this);
        }
    }
}


export class FieldDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public typeRef(): TypeRefContext {
        return this.getRuleContext(0, TypeRefContext)!;
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public scalar(): ScalarContext | null {
        return this.getRuleContext(0, ScalarContext);
    }
    public emptyVector(): EmptyVectorContext | null {
        return this.getRuleContext(0, EmptyVectorContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_fieldDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterFieldDecl) {
             listener.enterFieldDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitFieldDecl) {
             listener.exitFieldDecl(this);
        }
    }
}


export class EmptyVectorContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_emptyVector;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterEmptyVector) {
             listener.enterEmptyVector(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitEmptyVector) {
             listener.exitEmptyVector(this);
        }
    }
}


export class TypeRefContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_typeRef;
    }
    public override copyFrom(ctx: TypeRefContext): void {
        super.copyFrom(ctx);
    }
}
export class VectorTypeContext extends TypeRefContext {
    public constructor(ctx: TypeRefContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public typeRef(): TypeRefContext {
        return this.getRuleContext(0, TypeRefContext)!;
    }
    public INT_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.INT_LITERAL, 0);
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterVectorType) {
             listener.enterVectorType(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitVectorType) {
             listener.exitVectorType(this);
        }
    }
}
export class NamedTypeContext extends TypeRefContext {
    public constructor(ctx: TypeRefContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public nsIdent(): NsIdentContext {
        return this.getRuleContext(0, NsIdentContext)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterNamedType) {
             listener.enterNamedType(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitNamedType) {
             listener.exitNamedType(this);
        }
    }
}


export class NsIdentContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_nsIdent;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterNsIdent) {
             listener.enterNsIdent(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitNsIdent) {
             listener.exitNsIdent(this);
        }
    }
}


export class EnumDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public ENUM(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.ENUM, 0)!;
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public enumValDecl(): EnumValDeclContext[];
    public enumValDecl(i: number): EnumValDeclContext | null;
    public enumValDecl(i?: number): EnumValDeclContext[] | EnumValDeclContext | null {
        if (i === undefined) {
            return this.getRuleContexts(EnumValDeclContext);
        }

        return this.getRuleContext(i, EnumValDeclContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_enumDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterEnumDecl) {
             listener.enterEnumDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitEnumDecl) {
             listener.exitEnumDecl(this);
        }
    }
}


export class EnumValDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public scalar(): ScalarContext | null {
        return this.getRuleContext(0, ScalarContext);
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_enumValDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterEnumValDecl) {
             listener.enterEnumValDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitEnumValDecl) {
             listener.exitEnumValDecl(this);
        }
    }
}


export class UnionDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public UNION(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.UNION, 0)!;
    }
    public identifier(): IdentifierContext[];
    public identifier(i: number): IdentifierContext | null;
    public identifier(i?: number): IdentifierContext[] | IdentifierContext | null {
        if (i === undefined) {
            return this.getRuleContexts(IdentifierContext);
        }

        return this.getRuleContext(i, IdentifierContext);
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public unionValDecl(): UnionValDeclContext[];
    public unionValDecl(i: number): UnionValDeclContext | null;
    public unionValDecl(i?: number): UnionValDeclContext[] | UnionValDeclContext | null {
        if (i === undefined) {
            return this.getRuleContexts(UnionValDeclContext);
        }

        return this.getRuleContext(i, UnionValDeclContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_unionDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterUnionDecl) {
             listener.enterUnionDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitUnionDecl) {
             listener.exitUnionDecl(this);
        }
    }
}


export class UnionValDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public nsIdent(): NsIdentContext {
        return this.getRuleContext(0, NsIdentContext)!;
    }
    public identifier(): IdentifierContext | null {
        return this.getRuleContext(0, IdentifierContext);
    }
    public scalar(): ScalarContext | null {
        return this.getRuleContext(0, ScalarContext);
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_unionValDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterUnionValDecl) {
             listener.enterUnionValDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitUnionValDecl) {
             listener.exitUnionValDecl(this);
        }
    }
}


export class RpcServiceDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public RPC_SERVICE(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.RPC_SERVICE, 0)!;
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public rpcMethod(): RpcMethodContext[];
    public rpcMethod(i: number): RpcMethodContext | null;
    public rpcMethod(i?: number): RpcMethodContext[] | RpcMethodContext | null {
        if (i === undefined) {
            return this.getRuleContexts(RpcMethodContext);
        }

        return this.getRuleContext(i, RpcMethodContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_rpcServiceDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterRpcServiceDecl) {
             listener.enterRpcServiceDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitRpcServiceDecl) {
             listener.exitRpcServiceDecl(this);
        }
    }
}


export class RpcMethodContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public nsIdent(): NsIdentContext[];
    public nsIdent(i: number): NsIdentContext | null;
    public nsIdent(i?: number): NsIdentContext[] | NsIdentContext | null {
        if (i === undefined) {
            return this.getRuleContexts(NsIdentContext);
        }

        return this.getRuleContext(i, NsIdentContext);
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_rpcMethod;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterRpcMethod) {
             listener.enterRpcMethod(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitRpcMethod) {
             listener.exitRpcMethod(this);
        }
    }
}


export class MetadataContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public metadataEntry(): MetadataEntryContext[];
    public metadataEntry(i: number): MetadataEntryContext | null;
    public metadataEntry(i?: number): MetadataEntryContext[] | MetadataEntryContext | null {
        if (i === undefined) {
            return this.getRuleContexts(MetadataEntryContext);
        }

        return this.getRuleContext(i, MetadataEntryContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_metadata;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterMetadata) {
             listener.enterMetadata(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitMetadata) {
             listener.exitMetadata(this);
        }
    }
}


export class MetadataEntryContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public singleValue(): SingleValueContext | null {
        return this.getRuleContext(0, SingleValueContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_metadataEntry;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterMetadataEntry) {
             listener.enterMetadataEntry(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitMetadataEntry) {
             listener.exitMetadataEntry(this);
        }
    }
}


export class SingleValueContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public scalar(): ScalarContext | null {
        return this.getRuleContext(0, ScalarContext);
    }
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_singleValue;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterSingleValue) {
             listener.enterSingleValue(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitSingleValue) {
             listener.exitSingleValue(this);
        }
    }
}


export class ScalarContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_scalar;
    }
    public override copyFrom(ctx: ScalarContext): void {
        super.copyFrom(ctx);
    }
}
export class IntScalarContext extends ScalarContext {
    public constructor(ctx: ScalarContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public INT_LITERAL(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.INT_LITERAL, 0)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterIntScalar) {
             listener.enterIntScalar(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitIntScalar) {
             listener.exitIntScalar(this);
        }
    }
}
export class FloatScalarContext extends ScalarContext {
    public constructor(ctx: ScalarContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public FLOAT_LITERAL(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.FLOAT_LITERAL, 0)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterFloatScalar) {
             listener.enterFloatScalar(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitFloatScalar) {
             listener.exitFloatScalar(this);
        }
    }
}
export class HexFloatScalarContext extends ScalarContext {
    public constructor(ctx: ScalarContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public HEX_FLOAT_LITERAL(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.HEX_FLOAT_LITERAL, 0)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterHexFloatScalar) {
             listener.enterHexFloatScalar(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitHexFloatScalar) {
             listener.exitHexFloatScalar(this);
        }
    }
}
export class StringScalarContext extends ScalarContext {
    public constructor(ctx: ScalarContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public STRING_LITERAL(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterStringScalar) {
             listener.enterStringScalar(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitStringScalar) {
             listener.exitStringScalar(this);
        }
    }
}
export class IdentScalarContext extends ScalarContext {
    public constructor(ctx: ScalarContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterIdentScalar) {
             listener.enterIdentScalar(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitIdentScalar) {
             listener.exitIdentScalar(this);
        }
    }
}


export class ObjectLiteralDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public objectLiteral(): ObjectLiteralContext {
        return this.getRuleContext(0, ObjectLiteralContext)!;
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_objectLiteralDecl;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterObjectLiteralDecl) {
             listener.enterObjectLiteralDecl(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitObjectLiteralDecl) {
             listener.exitObjectLiteralDecl(this);
        }
    }
}


export class ObjectLiteralContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public objectField(): ObjectFieldContext[];
    public objectField(i: number): ObjectFieldContext | null;
    public objectField(i?: number): ObjectFieldContext[] | ObjectFieldContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ObjectFieldContext);
        }

        return this.getRuleContext(i, ObjectFieldContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_objectLiteral;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterObjectLiteral) {
             listener.enterObjectLiteral(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitObjectLiteral) {
             listener.exitObjectLiteral(this);
        }
    }
}


export class ObjectFieldContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public objectValue(): ObjectValueContext {
        return this.getRuleContext(0, ObjectValueContext)!;
    }
    public identifier(): IdentifierContext | null {
        return this.getRuleContext(0, IdentifierContext);
    }
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_objectField;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterObjectField) {
             listener.enterObjectField(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitObjectField) {
             listener.exitObjectField(this);
        }
    }
}


export class ObjectValueContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_objectValue;
    }
    public override copyFrom(ctx: ObjectValueContext): void {
        super.copyFrom(ctx);
    }
}
export class ScalarValueContext extends ObjectValueContext {
    public constructor(ctx: ObjectValueContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public scalar(): ScalarContext {
        return this.getRuleContext(0, ScalarContext)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterScalarValue) {
             listener.enterScalarValue(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitScalarValue) {
             listener.exitScalarValue(this);
        }
    }
}
export class NestedObjectValueContext extends ObjectValueContext {
    public constructor(ctx: ObjectValueContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public objectLiteral(): ObjectLiteralContext {
        return this.getRuleContext(0, ObjectLiteralContext)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterNestedObjectValue) {
             listener.enterNestedObjectValue(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitNestedObjectValue) {
             listener.exitNestedObjectValue(this);
        }
    }
}
export class ArrayValueContext extends ObjectValueContext {
    public constructor(ctx: ObjectValueContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public objectValue(): ObjectValueContext[];
    public objectValue(i: number): ObjectValueContext | null;
    public objectValue(i?: number): ObjectValueContext[] | ObjectValueContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ObjectValueContext);
        }

        return this.getRuleContext(i, ObjectValueContext);
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterArrayValue) {
             listener.enterArrayValue(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitArrayValue) {
             listener.exitArrayValue(this);
        }
    }
}


export class IdentifierContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENT(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.IDENT, 0);
    }
    public keywordAsIdent(): KeywordAsIdentContext | null {
        return this.getRuleContext(0, KeywordAsIdentContext);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_identifier;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterIdentifier) {
             listener.enterIdentifier(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitIdentifier) {
             listener.exitIdentifier(this);
        }
    }
}


export class KeywordAsIdentContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public TABLE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.TABLE, 0);
    }
    public STRUCT(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.STRUCT, 0);
    }
    public ENUM(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.ENUM, 0);
    }
    public UNION(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.UNION, 0);
    }
    public NAMESPACE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.NAMESPACE, 0);
    }
    public INCLUDE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.INCLUDE, 0);
    }
    public NATIVE_INCLUDE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.NATIVE_INCLUDE, 0);
    }
    public ATTRIBUTE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.ATTRIBUTE, 0);
    }
    public ROOT_TYPE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.ROOT_TYPE, 0);
    }
    public FILE_EXTENSION(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.FILE_EXTENSION, 0);
    }
    public FILE_IDENTIFIER(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.FILE_IDENTIFIER, 0);
    }
    public RPC_SERVICE(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.RPC_SERVICE, 0);
    }
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_keywordAsIdent;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterKeywordAsIdent) {
             listener.enterKeywordAsIdent(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitKeywordAsIdent) {
             listener.exitKeywordAsIdent(this);
        }
    }
}
