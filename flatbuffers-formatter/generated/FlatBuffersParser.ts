
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
    public static readonly T__13 = 14;
    public static readonly T__14 = 15;
    public static readonly T__15 = 16;
    public static readonly T__16 = 17;
    public static readonly T__17 = 18;
    public static readonly T__18 = 19;
    public static readonly T__19 = 20;
    public static readonly T__20 = 21;
    public static readonly T__21 = 22;
    public static readonly T__22 = 23;
    public static readonly T__23 = 24;
    public static readonly INT_LITERAL = 25;
    public static readonly FLOAT_LITERAL = 26;
    public static readonly STRING_LITERAL = 27;
    public static readonly IDENT = 28;
    public static readonly DOC_COMMENT = 29;
    public static readonly LINE_COMMENT = 30;
    public static readonly BLOCK_COMMENT = 31;
    public static readonly WS = 32;
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
    public static readonly RULE_typeRef = 11;
    public static readonly RULE_enumDecl = 12;
    public static readonly RULE_enumValDecl = 13;
    public static readonly RULE_unionDecl = 14;
    public static readonly RULE_unionValDecl = 15;
    public static readonly RULE_rpcServiceDecl = 16;
    public static readonly RULE_rpcMethod = 17;
    public static readonly RULE_metadata = 18;
    public static readonly RULE_metadataEntry = 19;
    public static readonly RULE_singleValue = 20;
    public static readonly RULE_scalar = 21;
    public static readonly RULE_objectLiteralDecl = 22;
    public static readonly RULE_objectLiteral = 23;
    public static readonly RULE_objectField = 24;
    public static readonly RULE_objectValue = 25;

    public static readonly literalNames = [
        null, "'include'", "';'", "'namespace'", "'.'", "'attribute'", "'root_type'", 
        "'file_extension'", "'file_identifier'", "'table'", "'{'", "'}'", 
        "'struct'", "':'", "'='", "'['", "']'", "'enum'", "','", "'union'", 
        "'rpc_service'", "'('", "')'", "'+'", "'-'"
    ];

    public static readonly symbolicNames = [
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, null, null, null, null, null, null, null, null, 
        null, null, null, "INT_LITERAL", "FLOAT_LITERAL", "STRING_LITERAL", 
        "IDENT", "DOC_COMMENT", "LINE_COMMENT", "BLOCK_COMMENT", "WS"
    ];
    public static readonly ruleNames = [
        "schema", "decl", "includeDecl", "namespaceDecl", "attributeDecl", 
        "rootTypeDecl", "fileExtensionDecl", "fileIdentifierDecl", "tableDecl", 
        "structDecl", "fieldDecl", "typeRef", "enumDecl", "enumValDecl", 
        "unionDecl", "unionValDecl", "rpcServiceDecl", "rpcMethod", "metadata", 
        "metadataEntry", "singleValue", "scalar", "objectLiteralDecl", "objectLiteral", 
        "objectField", "objectValue",
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
            this.state = 55;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while ((((_la) & ~0x1F) === 0 && ((1 << _la) & 1710058) !== 0)) {
                {
                {
                this.state = 52;
                this.decl();
                }
                }
                this.state = 57;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 58;
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
            this.state = 72;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.T__0:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 60;
                this.includeDecl();
                }
                break;
            case FlatBuffersParser.T__2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 61;
                this.namespaceDecl();
                }
                break;
            case FlatBuffersParser.T__4:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 62;
                this.attributeDecl();
                }
                break;
            case FlatBuffersParser.T__5:
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 63;
                this.rootTypeDecl();
                }
                break;
            case FlatBuffersParser.T__6:
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 64;
                this.fileExtensionDecl();
                }
                break;
            case FlatBuffersParser.T__7:
                this.enterOuterAlt(localContext, 6);
                {
                this.state = 65;
                this.fileIdentifierDecl();
                }
                break;
            case FlatBuffersParser.T__8:
                this.enterOuterAlt(localContext, 7);
                {
                this.state = 66;
                this.tableDecl();
                }
                break;
            case FlatBuffersParser.T__11:
                this.enterOuterAlt(localContext, 8);
                {
                this.state = 67;
                this.structDecl();
                }
                break;
            case FlatBuffersParser.T__16:
                this.enterOuterAlt(localContext, 9);
                {
                this.state = 68;
                this.enumDecl();
                }
                break;
            case FlatBuffersParser.T__18:
                this.enterOuterAlt(localContext, 10);
                {
                this.state = 69;
                this.unionDecl();
                }
                break;
            case FlatBuffersParser.T__19:
                this.enterOuterAlt(localContext, 11);
                {
                this.state = 70;
                this.rpcServiceDecl();
                }
                break;
            case FlatBuffersParser.T__9:
                this.enterOuterAlt(localContext, 12);
                {
                this.state = 71;
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
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 74;
            this.match(FlatBuffersParser.T__0);
            this.state = 75;
            this.match(FlatBuffersParser.STRING_LITERAL);
            this.state = 76;
            this.match(FlatBuffersParser.T__1);
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
            this.state = 78;
            this.match(FlatBuffersParser.T__2);
            this.state = 79;
            this.match(FlatBuffersParser.IDENT);
            this.state = 84;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 4) {
                {
                {
                this.state = 80;
                this.match(FlatBuffersParser.T__3);
                this.state = 81;
                this.match(FlatBuffersParser.IDENT);
                }
                }
                this.state = 86;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 87;
            this.match(FlatBuffersParser.T__1);
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
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 89;
            this.match(FlatBuffersParser.T__4);
            this.state = 90;
            _la = this.tokenStream.LA(1);
            if(!(_la === 27 || _la === 28)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 91;
            this.match(FlatBuffersParser.T__1);
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
            this.state = 93;
            this.match(FlatBuffersParser.T__5);
            this.state = 94;
            this.match(FlatBuffersParser.IDENT);
            this.state = 95;
            this.match(FlatBuffersParser.T__1);
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
            this.state = 97;
            this.match(FlatBuffersParser.T__6);
            this.state = 98;
            this.match(FlatBuffersParser.STRING_LITERAL);
            this.state = 99;
            this.match(FlatBuffersParser.T__1);
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
            this.state = 101;
            this.match(FlatBuffersParser.T__7);
            this.state = 102;
            this.match(FlatBuffersParser.STRING_LITERAL);
            this.state = 103;
            this.match(FlatBuffersParser.T__1);
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
            this.state = 105;
            this.match(FlatBuffersParser.T__8);
            this.state = 106;
            this.match(FlatBuffersParser.IDENT);
            this.state = 108;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 21) {
                {
                this.state = 107;
                this.metadata();
                }
            }

            this.state = 110;
            this.match(FlatBuffersParser.T__9);
            this.state = 114;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 28) {
                {
                {
                this.state = 111;
                this.fieldDecl();
                }
                }
                this.state = 116;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 117;
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
    public structDecl(): StructDeclContext {
        let localContext = new StructDeclContext(this.context, this.state);
        this.enterRule(localContext, 18, FlatBuffersParser.RULE_structDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 119;
            this.match(FlatBuffersParser.T__11);
            this.state = 120;
            this.match(FlatBuffersParser.IDENT);
            this.state = 122;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 21) {
                {
                this.state = 121;
                this.metadata();
                }
            }

            this.state = 124;
            this.match(FlatBuffersParser.T__9);
            this.state = 128;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 28) {
                {
                {
                this.state = 125;
                this.fieldDecl();
                }
                }
                this.state = 130;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 131;
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
    public fieldDecl(): FieldDeclContext {
        let localContext = new FieldDeclContext(this.context, this.state);
        this.enterRule(localContext, 20, FlatBuffersParser.RULE_fieldDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 133;
            this.match(FlatBuffersParser.IDENT);
            this.state = 134;
            this.match(FlatBuffersParser.T__12);
            this.state = 135;
            this.typeRef();
            this.state = 138;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 14) {
                {
                this.state = 136;
                this.match(FlatBuffersParser.T__13);
                this.state = 137;
                this.scalar();
                }
            }

            this.state = 141;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 21) {
                {
                this.state = 140;
                this.metadata();
                }
            }

            this.state = 143;
            this.match(FlatBuffersParser.T__1);
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
        this.enterRule(localContext, 22, FlatBuffersParser.RULE_typeRef);
        try {
            this.state = 150;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.T__14:
                localContext = new VectorTypeContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 145;
                this.match(FlatBuffersParser.T__14);
                this.state = 146;
                this.typeRef();
                this.state = 147;
                this.match(FlatBuffersParser.T__15);
                }
                break;
            case FlatBuffersParser.IDENT:
                localContext = new NamedTypeContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 149;
                this.match(FlatBuffersParser.IDENT);
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
    public enumDecl(): EnumDeclContext {
        let localContext = new EnumDeclContext(this.context, this.state);
        this.enterRule(localContext, 24, FlatBuffersParser.RULE_enumDecl);
        let _la: number;
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 152;
            this.match(FlatBuffersParser.T__16);
            this.state = 153;
            this.match(FlatBuffersParser.IDENT);
            this.state = 156;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 13) {
                {
                this.state = 154;
                this.match(FlatBuffersParser.T__12);
                this.state = 155;
                this.match(FlatBuffersParser.IDENT);
                }
            }

            this.state = 159;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 21) {
                {
                this.state = 158;
                this.metadata();
                }
            }

            this.state = 161;
            this.match(FlatBuffersParser.T__9);
            this.state = 173;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 28) {
                {
                this.state = 162;
                this.enumValDecl();
                this.state = 167;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 12, this.context);
                while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                    if (alternative === 1) {
                        {
                        {
                        this.state = 163;
                        this.match(FlatBuffersParser.T__17);
                        this.state = 164;
                        this.enumValDecl();
                        }
                        }
                    }
                    this.state = 169;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 12, this.context);
                }
                this.state = 171;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 18) {
                    {
                    this.state = 170;
                    this.match(FlatBuffersParser.T__17);
                    }
                }

                }
            }

            this.state = 175;
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
    public enumValDecl(): EnumValDeclContext {
        let localContext = new EnumValDeclContext(this.context, this.state);
        this.enterRule(localContext, 26, FlatBuffersParser.RULE_enumValDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 177;
            this.match(FlatBuffersParser.IDENT);
            this.state = 180;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 14) {
                {
                this.state = 178;
                this.match(FlatBuffersParser.T__13);
                this.state = 179;
                this.scalar();
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
        this.enterRule(localContext, 28, FlatBuffersParser.RULE_unionDecl);
        let _la: number;
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 182;
            this.match(FlatBuffersParser.T__18);
            this.state = 183;
            this.match(FlatBuffersParser.IDENT);
            this.state = 185;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 21) {
                {
                this.state = 184;
                this.metadata();
                }
            }

            this.state = 187;
            this.match(FlatBuffersParser.T__9);
            this.state = 199;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 28) {
                {
                this.state = 188;
                this.unionValDecl();
                this.state = 193;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 17, this.context);
                while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                    if (alternative === 1) {
                        {
                        {
                        this.state = 189;
                        this.match(FlatBuffersParser.T__17);
                        this.state = 190;
                        this.unionValDecl();
                        }
                        }
                    }
                    this.state = 195;
                    this.errorHandler.sync(this);
                    alternative = this.interpreter.adaptivePredict(this.tokenStream, 17, this.context);
                }
                this.state = 197;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 18) {
                    {
                    this.state = 196;
                    this.match(FlatBuffersParser.T__17);
                    }
                }

                }
            }

            this.state = 201;
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
    public unionValDecl(): UnionValDeclContext {
        let localContext = new UnionValDeclContext(this.context, this.state);
        this.enterRule(localContext, 30, FlatBuffersParser.RULE_unionValDecl);
        try {
            this.state = 207;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 20, this.context) ) {
            case 1:
                localContext = new UnionAliasValContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 203;
                this.match(FlatBuffersParser.IDENT);
                this.state = 204;
                this.match(FlatBuffersParser.T__12);
                this.state = 205;
                this.match(FlatBuffersParser.IDENT);
                }
                break;
            case 2:
                localContext = new UnionPlainValContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 206;
                this.match(FlatBuffersParser.IDENT);
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
    public rpcServiceDecl(): RpcServiceDeclContext {
        let localContext = new RpcServiceDeclContext(this.context, this.state);
        this.enterRule(localContext, 32, FlatBuffersParser.RULE_rpcServiceDecl);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 209;
            this.match(FlatBuffersParser.T__19);
            this.state = 210;
            this.match(FlatBuffersParser.IDENT);
            this.state = 211;
            this.match(FlatBuffersParser.T__9);
            this.state = 215;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 28) {
                {
                {
                this.state = 212;
                this.rpcMethod();
                }
                }
                this.state = 217;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 218;
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
    public rpcMethod(): RpcMethodContext {
        let localContext = new RpcMethodContext(this.context, this.state);
        this.enterRule(localContext, 34, FlatBuffersParser.RULE_rpcMethod);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 220;
            this.match(FlatBuffersParser.IDENT);
            this.state = 221;
            this.match(FlatBuffersParser.T__20);
            this.state = 222;
            this.match(FlatBuffersParser.IDENT);
            this.state = 223;
            this.match(FlatBuffersParser.T__21);
            this.state = 224;
            this.match(FlatBuffersParser.T__12);
            this.state = 225;
            this.match(FlatBuffersParser.IDENT);
            this.state = 227;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 21) {
                {
                this.state = 226;
                this.metadata();
                }
            }

            this.state = 229;
            this.match(FlatBuffersParser.T__1);
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
        this.enterRule(localContext, 36, FlatBuffersParser.RULE_metadata);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 231;
            this.match(FlatBuffersParser.T__20);
            this.state = 240;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 28) {
                {
                this.state = 232;
                this.metadataEntry();
                this.state = 237;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 18) {
                    {
                    {
                    this.state = 233;
                    this.match(FlatBuffersParser.T__17);
                    this.state = 234;
                    this.metadataEntry();
                    }
                    }
                    this.state = 239;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
            }

            this.state = 242;
            this.match(FlatBuffersParser.T__21);
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
        this.enterRule(localContext, 38, FlatBuffersParser.RULE_metadataEntry);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 244;
            this.match(FlatBuffersParser.IDENT);
            this.state = 247;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 13) {
                {
                this.state = 245;
                this.match(FlatBuffersParser.T__12);
                this.state = 246;
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
        this.enterRule(localContext, 40, FlatBuffersParser.RULE_singleValue);
        try {
            this.state = 251;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 26, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 249;
                this.scalar();
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 250;
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
        this.enterRule(localContext, 42, FlatBuffersParser.RULE_scalar);
        let _la: number;
        try {
            this.state = 263;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 29, this.context) ) {
            case 1:
                localContext = new IntScalarContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 254;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 23 || _la === 24) {
                    {
                    this.state = 253;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 23 || _la === 24)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 256;
                this.match(FlatBuffersParser.INT_LITERAL);
                }
                break;
            case 2:
                localContext = new FloatScalarContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 258;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 23 || _la === 24) {
                    {
                    this.state = 257;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 23 || _la === 24)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 260;
                this.match(FlatBuffersParser.FLOAT_LITERAL);
                }
                break;
            case 3:
                localContext = new StringScalarContext(localContext);
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 261;
                this.match(FlatBuffersParser.STRING_LITERAL);
                }
                break;
            case 4:
                localContext = new IdentScalarContext(localContext);
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 262;
                this.match(FlatBuffersParser.IDENT);
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
        this.enterRule(localContext, 44, FlatBuffersParser.RULE_objectLiteralDecl);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 265;
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
        this.enterRule(localContext, 46, FlatBuffersParser.RULE_objectLiteral);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 267;
            this.match(FlatBuffersParser.T__9);
            this.state = 276;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            if (_la === 27 || _la === 28) {
                {
                this.state = 268;
                this.objectField();
                this.state = 273;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                while (_la === 18) {
                    {
                    {
                    this.state = 269;
                    this.match(FlatBuffersParser.T__17);
                    this.state = 270;
                    this.objectField();
                    }
                    }
                    this.state = 275;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                }
                }
            }

            this.state = 278;
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
    public objectField(): ObjectFieldContext {
        let localContext = new ObjectFieldContext(this.context, this.state);
        this.enterRule(localContext, 48, FlatBuffersParser.RULE_objectField);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 280;
            _la = this.tokenStream.LA(1);
            if(!(_la === 27 || _la === 28)) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            this.state = 281;
            this.match(FlatBuffersParser.T__12);
            this.state = 282;
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
        this.enterRule(localContext, 50, FlatBuffersParser.RULE_objectValue);
        let _la: number;
        try {
            this.state = 298;
            this.errorHandler.sync(this);
            switch (this.tokenStream.LA(1)) {
            case FlatBuffersParser.T__22:
            case FlatBuffersParser.T__23:
            case FlatBuffersParser.INT_LITERAL:
            case FlatBuffersParser.FLOAT_LITERAL:
            case FlatBuffersParser.STRING_LITERAL:
            case FlatBuffersParser.IDENT:
                localContext = new ScalarValueContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 284;
                this.scalar();
                }
                break;
            case FlatBuffersParser.T__9:
                localContext = new NestedObjectValueContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 285;
                this.objectLiteral();
                }
                break;
            case FlatBuffersParser.T__14:
                localContext = new ArrayValueContext(localContext);
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 286;
                this.match(FlatBuffersParser.T__14);
                this.state = 295;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if ((((_la) & ~0x1F) === 0 && ((1 << _la) & 528516096) !== 0)) {
                    {
                    this.state = 287;
                    this.objectValue();
                    this.state = 292;
                    this.errorHandler.sync(this);
                    _la = this.tokenStream.LA(1);
                    while (_la === 18) {
                        {
                        {
                        this.state = 288;
                        this.match(FlatBuffersParser.T__17);
                        this.state = 289;
                        this.objectValue();
                        }
                        }
                        this.state = 294;
                        this.errorHandler.sync(this);
                        _la = this.tokenStream.LA(1);
                    }
                    }
                }

                this.state = 297;
                this.match(FlatBuffersParser.T__15);
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

    public static readonly _serializedATN: number[] = [
        4,1,32,301,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,
        6,2,7,7,7,2,8,7,8,2,9,7,9,2,10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,
        2,14,7,14,2,15,7,15,2,16,7,16,2,17,7,17,2,18,7,18,2,19,7,19,2,20,
        7,20,2,21,7,21,2,22,7,22,2,23,7,23,2,24,7,24,2,25,7,25,1,0,5,0,54,
        8,0,10,0,12,0,57,9,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,3,1,73,8,1,1,2,1,2,1,2,1,2,1,3,1,3,1,3,1,3,5,3,83,8,
        3,10,3,12,3,86,9,3,1,3,1,3,1,4,1,4,1,4,1,4,1,5,1,5,1,5,1,5,1,6,1,
        6,1,6,1,6,1,7,1,7,1,7,1,7,1,8,1,8,1,8,3,8,109,8,8,1,8,1,8,5,8,113,
        8,8,10,8,12,8,116,9,8,1,8,1,8,1,9,1,9,1,9,3,9,123,8,9,1,9,1,9,5,
        9,127,8,9,10,9,12,9,130,9,9,1,9,1,9,1,10,1,10,1,10,1,10,1,10,3,10,
        139,8,10,1,10,3,10,142,8,10,1,10,1,10,1,11,1,11,1,11,1,11,1,11,3,
        11,151,8,11,1,12,1,12,1,12,1,12,3,12,157,8,12,1,12,3,12,160,8,12,
        1,12,1,12,1,12,1,12,5,12,166,8,12,10,12,12,12,169,9,12,1,12,3,12,
        172,8,12,3,12,174,8,12,1,12,1,12,1,13,1,13,1,13,3,13,181,8,13,1,
        14,1,14,1,14,3,14,186,8,14,1,14,1,14,1,14,1,14,5,14,192,8,14,10,
        14,12,14,195,9,14,1,14,3,14,198,8,14,3,14,200,8,14,1,14,1,14,1,15,
        1,15,1,15,1,15,3,15,208,8,15,1,16,1,16,1,16,1,16,5,16,214,8,16,10,
        16,12,16,217,9,16,1,16,1,16,1,17,1,17,1,17,1,17,1,17,1,17,1,17,3,
        17,228,8,17,1,17,1,17,1,18,1,18,1,18,1,18,5,18,236,8,18,10,18,12,
        18,239,9,18,3,18,241,8,18,1,18,1,18,1,19,1,19,1,19,3,19,248,8,19,
        1,20,1,20,3,20,252,8,20,1,21,3,21,255,8,21,1,21,1,21,3,21,259,8,
        21,1,21,1,21,1,21,3,21,264,8,21,1,22,1,22,1,23,1,23,1,23,1,23,5,
        23,272,8,23,10,23,12,23,275,9,23,3,23,277,8,23,1,23,1,23,1,24,1,
        24,1,24,1,24,1,25,1,25,1,25,1,25,1,25,1,25,5,25,291,8,25,10,25,12,
        25,294,9,25,3,25,296,8,25,1,25,3,25,299,8,25,1,25,0,0,26,0,2,4,6,
        8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,
        0,2,1,0,27,28,1,0,23,24,322,0,55,1,0,0,0,2,72,1,0,0,0,4,74,1,0,0,
        0,6,78,1,0,0,0,8,89,1,0,0,0,10,93,1,0,0,0,12,97,1,0,0,0,14,101,1,
        0,0,0,16,105,1,0,0,0,18,119,1,0,0,0,20,133,1,0,0,0,22,150,1,0,0,
        0,24,152,1,0,0,0,26,177,1,0,0,0,28,182,1,0,0,0,30,207,1,0,0,0,32,
        209,1,0,0,0,34,220,1,0,0,0,36,231,1,0,0,0,38,244,1,0,0,0,40,251,
        1,0,0,0,42,263,1,0,0,0,44,265,1,0,0,0,46,267,1,0,0,0,48,280,1,0,
        0,0,50,298,1,0,0,0,52,54,3,2,1,0,53,52,1,0,0,0,54,57,1,0,0,0,55,
        53,1,0,0,0,55,56,1,0,0,0,56,58,1,0,0,0,57,55,1,0,0,0,58,59,5,0,0,
        1,59,1,1,0,0,0,60,73,3,4,2,0,61,73,3,6,3,0,62,73,3,8,4,0,63,73,3,
        10,5,0,64,73,3,12,6,0,65,73,3,14,7,0,66,73,3,16,8,0,67,73,3,18,9,
        0,68,73,3,24,12,0,69,73,3,28,14,0,70,73,3,32,16,0,71,73,3,44,22,
        0,72,60,1,0,0,0,72,61,1,0,0,0,72,62,1,0,0,0,72,63,1,0,0,0,72,64,
        1,0,0,0,72,65,1,0,0,0,72,66,1,0,0,0,72,67,1,0,0,0,72,68,1,0,0,0,
        72,69,1,0,0,0,72,70,1,0,0,0,72,71,1,0,0,0,73,3,1,0,0,0,74,75,5,1,
        0,0,75,76,5,27,0,0,76,77,5,2,0,0,77,5,1,0,0,0,78,79,5,3,0,0,79,84,
        5,28,0,0,80,81,5,4,0,0,81,83,5,28,0,0,82,80,1,0,0,0,83,86,1,0,0,
        0,84,82,1,0,0,0,84,85,1,0,0,0,85,87,1,0,0,0,86,84,1,0,0,0,87,88,
        5,2,0,0,88,7,1,0,0,0,89,90,5,5,0,0,90,91,7,0,0,0,91,92,5,2,0,0,92,
        9,1,0,0,0,93,94,5,6,0,0,94,95,5,28,0,0,95,96,5,2,0,0,96,11,1,0,0,
        0,97,98,5,7,0,0,98,99,5,27,0,0,99,100,5,2,0,0,100,13,1,0,0,0,101,
        102,5,8,0,0,102,103,5,27,0,0,103,104,5,2,0,0,104,15,1,0,0,0,105,
        106,5,9,0,0,106,108,5,28,0,0,107,109,3,36,18,0,108,107,1,0,0,0,108,
        109,1,0,0,0,109,110,1,0,0,0,110,114,5,10,0,0,111,113,3,20,10,0,112,
        111,1,0,0,0,113,116,1,0,0,0,114,112,1,0,0,0,114,115,1,0,0,0,115,
        117,1,0,0,0,116,114,1,0,0,0,117,118,5,11,0,0,118,17,1,0,0,0,119,
        120,5,12,0,0,120,122,5,28,0,0,121,123,3,36,18,0,122,121,1,0,0,0,
        122,123,1,0,0,0,123,124,1,0,0,0,124,128,5,10,0,0,125,127,3,20,10,
        0,126,125,1,0,0,0,127,130,1,0,0,0,128,126,1,0,0,0,128,129,1,0,0,
        0,129,131,1,0,0,0,130,128,1,0,0,0,131,132,5,11,0,0,132,19,1,0,0,
        0,133,134,5,28,0,0,134,135,5,13,0,0,135,138,3,22,11,0,136,137,5,
        14,0,0,137,139,3,42,21,0,138,136,1,0,0,0,138,139,1,0,0,0,139,141,
        1,0,0,0,140,142,3,36,18,0,141,140,1,0,0,0,141,142,1,0,0,0,142,143,
        1,0,0,0,143,144,5,2,0,0,144,21,1,0,0,0,145,146,5,15,0,0,146,147,
        3,22,11,0,147,148,5,16,0,0,148,151,1,0,0,0,149,151,5,28,0,0,150,
        145,1,0,0,0,150,149,1,0,0,0,151,23,1,0,0,0,152,153,5,17,0,0,153,
        156,5,28,0,0,154,155,5,13,0,0,155,157,5,28,0,0,156,154,1,0,0,0,156,
        157,1,0,0,0,157,159,1,0,0,0,158,160,3,36,18,0,159,158,1,0,0,0,159,
        160,1,0,0,0,160,161,1,0,0,0,161,173,5,10,0,0,162,167,3,26,13,0,163,
        164,5,18,0,0,164,166,3,26,13,0,165,163,1,0,0,0,166,169,1,0,0,0,167,
        165,1,0,0,0,167,168,1,0,0,0,168,171,1,0,0,0,169,167,1,0,0,0,170,
        172,5,18,0,0,171,170,1,0,0,0,171,172,1,0,0,0,172,174,1,0,0,0,173,
        162,1,0,0,0,173,174,1,0,0,0,174,175,1,0,0,0,175,176,5,11,0,0,176,
        25,1,0,0,0,177,180,5,28,0,0,178,179,5,14,0,0,179,181,3,42,21,0,180,
        178,1,0,0,0,180,181,1,0,0,0,181,27,1,0,0,0,182,183,5,19,0,0,183,
        185,5,28,0,0,184,186,3,36,18,0,185,184,1,0,0,0,185,186,1,0,0,0,186,
        187,1,0,0,0,187,199,5,10,0,0,188,193,3,30,15,0,189,190,5,18,0,0,
        190,192,3,30,15,0,191,189,1,0,0,0,192,195,1,0,0,0,193,191,1,0,0,
        0,193,194,1,0,0,0,194,197,1,0,0,0,195,193,1,0,0,0,196,198,5,18,0,
        0,197,196,1,0,0,0,197,198,1,0,0,0,198,200,1,0,0,0,199,188,1,0,0,
        0,199,200,1,0,0,0,200,201,1,0,0,0,201,202,5,11,0,0,202,29,1,0,0,
        0,203,204,5,28,0,0,204,205,5,13,0,0,205,208,5,28,0,0,206,208,5,28,
        0,0,207,203,1,0,0,0,207,206,1,0,0,0,208,31,1,0,0,0,209,210,5,20,
        0,0,210,211,5,28,0,0,211,215,5,10,0,0,212,214,3,34,17,0,213,212,
        1,0,0,0,214,217,1,0,0,0,215,213,1,0,0,0,215,216,1,0,0,0,216,218,
        1,0,0,0,217,215,1,0,0,0,218,219,5,11,0,0,219,33,1,0,0,0,220,221,
        5,28,0,0,221,222,5,21,0,0,222,223,5,28,0,0,223,224,5,22,0,0,224,
        225,5,13,0,0,225,227,5,28,0,0,226,228,3,36,18,0,227,226,1,0,0,0,
        227,228,1,0,0,0,228,229,1,0,0,0,229,230,5,2,0,0,230,35,1,0,0,0,231,
        240,5,21,0,0,232,237,3,38,19,0,233,234,5,18,0,0,234,236,3,38,19,
        0,235,233,1,0,0,0,236,239,1,0,0,0,237,235,1,0,0,0,237,238,1,0,0,
        0,238,241,1,0,0,0,239,237,1,0,0,0,240,232,1,0,0,0,240,241,1,0,0,
        0,241,242,1,0,0,0,242,243,5,22,0,0,243,37,1,0,0,0,244,247,5,28,0,
        0,245,246,5,13,0,0,246,248,3,40,20,0,247,245,1,0,0,0,247,248,1,0,
        0,0,248,39,1,0,0,0,249,252,3,42,21,0,250,252,5,27,0,0,251,249,1,
        0,0,0,251,250,1,0,0,0,252,41,1,0,0,0,253,255,7,1,0,0,254,253,1,0,
        0,0,254,255,1,0,0,0,255,256,1,0,0,0,256,264,5,25,0,0,257,259,7,1,
        0,0,258,257,1,0,0,0,258,259,1,0,0,0,259,260,1,0,0,0,260,264,5,26,
        0,0,261,264,5,27,0,0,262,264,5,28,0,0,263,254,1,0,0,0,263,258,1,
        0,0,0,263,261,1,0,0,0,263,262,1,0,0,0,264,43,1,0,0,0,265,266,3,46,
        23,0,266,45,1,0,0,0,267,276,5,10,0,0,268,273,3,48,24,0,269,270,5,
        18,0,0,270,272,3,48,24,0,271,269,1,0,0,0,272,275,1,0,0,0,273,271,
        1,0,0,0,273,274,1,0,0,0,274,277,1,0,0,0,275,273,1,0,0,0,276,268,
        1,0,0,0,276,277,1,0,0,0,277,278,1,0,0,0,278,279,5,11,0,0,279,47,
        1,0,0,0,280,281,7,0,0,0,281,282,5,13,0,0,282,283,3,50,25,0,283,49,
        1,0,0,0,284,299,3,42,21,0,285,299,3,46,23,0,286,295,5,15,0,0,287,
        292,3,50,25,0,288,289,5,18,0,0,289,291,3,50,25,0,290,288,1,0,0,0,
        291,294,1,0,0,0,292,290,1,0,0,0,292,293,1,0,0,0,293,296,1,0,0,0,
        294,292,1,0,0,0,295,287,1,0,0,0,295,296,1,0,0,0,296,297,1,0,0,0,
        297,299,5,16,0,0,298,284,1,0,0,0,298,285,1,0,0,0,298,286,1,0,0,0,
        299,51,1,0,0,0,35,55,72,84,108,114,122,128,138,141,150,156,159,167,
        171,173,180,185,193,197,199,207,215,227,237,240,247,251,254,258,
        263,273,276,292,295,298
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
    public IDENT(): antlr.TerminalNode[];
    public IDENT(i: number): antlr.TerminalNode | null;
    public IDENT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(FlatBuffersParser.IDENT);
    	} else {
    		return this.getToken(FlatBuffersParser.IDENT, i);
    	}
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
    public STRING_LITERAL(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.STRING_LITERAL, 0);
    }
    public IDENT(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.IDENT, 0);
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
    }
    public typeRef(): TypeRefContext {
        return this.getRuleContext(0, TypeRefContext)!;
    }
    public scalar(): ScalarContext | null {
        return this.getRuleContext(0, ScalarContext);
    }
    public metadata(): MetadataContext | null {
        return this.getRuleContext(0, MetadataContext);
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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


export class EnumDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENT(): antlr.TerminalNode[];
    public IDENT(i: number): antlr.TerminalNode | null;
    public IDENT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(FlatBuffersParser.IDENT);
    	} else {
    		return this.getToken(FlatBuffersParser.IDENT, i);
    	}
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
    }
    public scalar(): ScalarContext | null {
        return this.getRuleContext(0, ScalarContext);
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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
    public override get ruleIndex(): number {
        return FlatBuffersParser.RULE_unionValDecl;
    }
    public override copyFrom(ctx: UnionValDeclContext): void {
        super.copyFrom(ctx);
    }
}
export class UnionAliasValContext extends UnionValDeclContext {
    public constructor(ctx: UnionValDeclContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public IDENT(): antlr.TerminalNode[];
    public IDENT(i: number): antlr.TerminalNode | null;
    public IDENT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(FlatBuffersParser.IDENT);
    	} else {
    		return this.getToken(FlatBuffersParser.IDENT, i);
    	}
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterUnionAliasVal) {
             listener.enterUnionAliasVal(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitUnionAliasVal) {
             listener.exitUnionAliasVal(this);
        }
    }
}
export class UnionPlainValContext extends UnionValDeclContext {
    public constructor(ctx: UnionValDeclContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
    }
    public override enterRule(listener: FlatBuffersListener): void {
        if(listener.enterUnionPlainVal) {
             listener.enterUnionPlainVal(this);
        }
    }
    public override exitRule(listener: FlatBuffersListener): void {
        if(listener.exitUnionPlainVal) {
             listener.exitUnionPlainVal(this);
        }
    }
}


export class RpcServiceDeclContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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
    public IDENT(): antlr.TerminalNode[];
    public IDENT(i: number): antlr.TerminalNode | null;
    public IDENT(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(FlatBuffersParser.IDENT);
    	} else {
    		return this.getToken(FlatBuffersParser.IDENT, i);
    	}
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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
    public IDENT(): antlr.TerminalNode {
        return this.getToken(FlatBuffersParser.IDENT, 0)!;
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
    public IDENT(): antlr.TerminalNode | null {
        return this.getToken(FlatBuffersParser.IDENT, 0);
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
