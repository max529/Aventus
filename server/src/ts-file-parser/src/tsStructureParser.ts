/**
 * Created by kor on 08/05/15.
 */

import * as ts from "typescript";
import * as tsm from "./tsASTMatchers";
export * as tsm from "./tsASTMatchers";
import { AliasNode, ClassModel, EnumDeclaration, FunctionDeclarationParams, NamespaceDeclaration, TypeModel } from "../index";
import { TypeKind } from "../index";
import { ArrayType } from "../index";
import { Annotation } from "../index";
import { Decorator } from "../index";
import { Constraint } from "../index";
import { FieldModel } from "../index";
import { Module } from "../index";
import { MethodModel } from "../index";
import { ParameterModel } from "../index";
import { UnionType } from "../index";
import { BasicType } from "../index";
import { classDecl } from "../index";
import { EnumMemberDeclaration } from "./../index";
import { JSONTransformer } from "./jsonTransformer";
import { TextDocument } from 'vscode-languageserver-textdocument';
import { AventusExtension } from "../../definition";
import { uriToPath } from "../../tools";
import { dirname, resolve } from 'path';
import { existsSync, Mode, readFileSync } from 'fs';
import { FilesManager } from '../../files/FilesManager';


function parse(content: string) {
    return ts.createSourceFile("sample.ts", content, ts.ScriptTarget.ES3, true);
}
var fld = tsm.Matching.field();

export function getClass(className: string, uri: string): ClassModel | undefined {
    let jsURI = uri.replace(AventusExtension.Component, AventusExtension.ComponentLogic);
    let file = FilesManager.getInstance().getByUri(jsURI);
    if (file) {
        let result = parseDocument(file.document);
        for (let _class of result.classes) {
            if (_class.name == className) {
                return _class;
            }
        }
    }
    return undefined;
}
export function getAlias(aliasName: string, uri: string): AliasNode | undefined {
    let jsURI = uri.replace(AventusExtension.Component, AventusExtension.ComponentLogic);
    let file = FilesManager.getInstance().getByUri(jsURI);
    if (file) {
        let result = parseDocument(file.document);
        for (let alias of result.aliases) {
            if (alias.name == aliasName) {
                return alias;
            }
        }
    }
    return undefined;
}
let savedModule: {
    [key: string]: {
        version: number,
        module: Module,
    }
} = {};

export function parseDocument(document: TextDocument): Module {
    if (savedModule[document.uri]) {
        if (savedModule[document.uri].version < document.version) {
            savedModule[document.uri] = {
                version: document.version,
                module: parseStruct(document.getText(), uriToPath(document.uri))
            };
        }
    }
    else {
        savedModule[document.uri] = {
            version: document.version,
            module: parseStruct(document.getText(), uriToPath(document.uri))
        };
    }
    return savedModule[document.uri].module;
}
function parseStruct(content: string, mpth: string): Module {

    var mod = parse(content);
    var module: Module = { namespaces: [], variables: [], functions: [], classes: [], aliases: [], enumDeclarations: [], _imports: [], name: mpth };
    const getNamespace = (pos: number): NamespaceDeclaration => {
        let biggestStart = -1;
        let result = {
            start: 0,
            end: 0,
            name: '',
            body: {
                start: 0,
                end: 0,
            }
        }
        for (let _namespace of module.namespaces) {
            if (pos > _namespace.start && pos < _namespace.end) {
                if (_namespace.start > biggestStart) {
                    biggestStart = _namespace.start;
                    result = _namespace;
                }
            }
        }
        return result;
    }

    tsm.Matching.visit(mod, x => {
        if (x.kind === ts.SyntaxKind.VariableDeclaration) {
            x.forEachChild(c => {
                if (c.kind === ts.SyntaxKind.FunctionExpression) {
                    const isExport = !!((x.parent.parent.modifiers || []) as any[]).find(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
                    const params: FunctionDeclarationParams[] = [];
                    let isAsync = !!(c.modifiers || [] as any).find(m => m.kind === ts.SyntaxKind.AsyncKeyword);
                    const name = ((x as ts.FunctionDeclaration).name?.escapedText || '') as string;
                    (c as any).parameters.forEach(param => {
                        params.push({
                            name: param.name.getText(),
                            type: (param.type && param.type.getText()) || "any",
                            mandatory: !param.questionToken
                        });
                    });
                    module.functions.push({
                        isArrow: false,
                        isExport,
                        isAsync,
                        name,
                        params,
                        start: (x as ts.FunctionDeclaration).getStart(),
                        end: (x as ts.FunctionDeclaration).getEnd(),
                        namespace: getNamespace((x as ts.FunctionDeclaration).getStart())
                    });
                }
                else if (c.kind == ts.SyntaxKind.Identifier) {
                    module.variables.push({
                        name: (c as ts.Identifier).escapedText + "",
                        start: (c as ts.Identifier).getStart(),
                        end: (c as ts.Identifier).getEnd(),
                    });
                }
            });
        }
        if (x.kind === ts.SyntaxKind.ImportDeclaration) {
            var impDec = <ts.ImportDeclaration>x;
            var localMod = parse(x.getText());
            var localImport: { clauses: string[], absPathNode: string[], absPathString: string, isNodeModule: boolean } = { clauses: [], absPathNode: [], absPathString: "", isNodeModule: false };
            var localNamedImports: string[];
            var localAbsPath: string[];
            var localAbsPathString: string;
            var localNodeModule: boolean = false;
            var pth = require("path");
            tsm.Matching.visit(localMod, y => {
                if (y.kind === ts.SyntaxKind.NamedImports) {
                    var lit = impDec.importClause?.getText();
                    if (lit) {
                        localNamedImports = lit.substring(1, lit.length - 1).split(",");
                        localImport.clauses = localNamedImports.map(im => {
                            return im.trim();
                        });
                    }
                }
                if (y.kind === ts.SyntaxKind.StringLiteral) {
                    var localPath = y.getText().substring(1, y.getText().length - 1);
                    if (localPath[0] === ".") {
                        var localP = resolve(dirname(mpth) + "/", localPath);
                        localAbsPath = localP.split(pth.sep);
                        localAbsPathString = localP;
                    } else {
                        localAbsPath = localPath.split(pth.sep);
                        localAbsPathString = localPath;
                        localNodeModule = true;
                    }
                    localImport.absPathNode = localAbsPath;
                    localImport.absPathString = localAbsPathString.replace(/[\\/]+/g, "/");
                    localImport.isNodeModule = localNodeModule;
                }
            });
            module._imports.push(localImport);
        }
        if (x.kind === ts.SyntaxKind.FunctionDeclaration || x.kind === ts.SyntaxKind.ArrowFunction) {
            const isArrow = x.kind === ts.SyntaxKind.ArrowFunction;

            const functionDeclaration = isArrow ? x as ts.ArrowFunction : x as ts.FunctionDeclaration;
            const parentVariable = functionDeclaration.parent as ts.VariableDeclaration;
            const name = isArrow
                ? parentVariable.name && parentVariable.name.getText()
                : functionDeclaration.name?.text;

            let isAsync = false;
            let isExport = false;
            let params: { name: string, type: string, mandatory: boolean }[] = [];
            if (name) {
                let modifierContainer = isArrow
                    ? (functionDeclaration.parent as ts.VariableDeclaration).initializer
                    : functionDeclaration;
                if (modifierContainer && modifierContainer.modifiers) {
                    modifierContainer.modifiers.forEach(modi => {
                        if (modi.kind === ts.SyntaxKind.AsyncKeyword) {
                            isAsync = true;
                        }
                        if (modi.kind === ts.SyntaxKind.ExportKeyword && !isArrow) {
                            isExport = true;
                        }
                    });
                }

                if (isArrow && !isExport) {
                    do {
                        modifierContainer = modifierContainer?.parent as ts.Expression;
                    } while (modifierContainer && modifierContainer.kind !== ts.SyntaxKind.VariableStatement);

                    if (modifierContainer && modifierContainer.modifiers) {
                        modifierContainer.modifiers.forEach(modi => {
                            if (modi.kind === ts.SyntaxKind.ExportKeyword) {
                                isExport = true;
                            }
                        });
                    }
                }

                functionDeclaration.parameters.forEach(param => {
                    params.push({
                        name: param.name.getText(),
                        type: (param.type && param.type.getText()) || "any",
                        mandatory: !param.questionToken
                    });

                });
                module.functions.push({
                    isArrow,
                    isExport,
                    isAsync,
                    name,
                    params,
                    start: functionDeclaration.getStart(),
                    end: functionDeclaration.getEnd(),
                    namespace: getNamespace(functionDeclaration.getStart())
                });
            }
        }


        if (x.kind === ts.SyntaxKind.ModuleDeclaration) {
            var cmod = <ts.ModuleDeclaration>x;
            if (cmod.body) {
                let parentNamespace = getNamespace(cmod.getStart());
                let _namespace = cmod.name.text;
                if (_namespace != "global") {
                    if (parentNamespace.name != "") {
                        _namespace = parentNamespace.name + '.' + _namespace;
                    }
                    module.namespaces.push({
                        start: cmod.getStart(),
                        end: cmod.getEnd(),
                        name: _namespace,
                        body: {
                            start: cmod.body.getStart() + 1,
                            end: cmod.body.getEnd() - 1,
                        }
                    })
                }
            }
        }


        if (x.kind === ts.SyntaxKind.TypeAliasDeclaration) {
            var u = <ts.TypeAliasDeclaration>x;
            if (u.name) {
                var aliasName = u.name.text;
                var type = buildType(u.type, mpth, module);
                let aliasInstance = {
                    name: aliasName,
                    type: type,
                    content: content.substring(x.getStart(), x.getEnd()),
                    namespace: getNamespace(x.getStart()),
                    extends: [],
                    decorators: [],
                    isExported: false,
                    start: x.getStart(),
                    end: x.getEnd()
                }
                if (u.modifiers) {
                    u.modifiers.forEach(x => {
                        if (x.kind === ts.SyntaxKind.ExportKeyword) {
                            aliasInstance.isExported = true;
                        }
                        else if (x.kind === ts.SyntaxKind.AbstractKeyword) { }
                        else if (x.kind === ts.SyntaxKind.PrivateKeyword) { }
                        else if (x.kind == ts.SyntaxKind.DeclareKeyword) { }
                        else {
                            throw new Error("Unknown token type alias modifiers " + x.kind);
                        }
                    });
                }
                module.aliases.push(aliasInstance);
            }

            //return;
        }

        if (x.kind === ts.SyntaxKind.EnumDeclaration) {
            var e = <ts.EnumDeclaration>x;
            var members: EnumMemberDeclaration[] = [];
            if (e.members) {
                e.members.forEach(member => {
                    let value: number | string | undefined;
                    if (member.initializer) {
                        if (member.initializer.kind === ts.SyntaxKind.NumericLiteral) {
                            value = parseInt((member.initializer as any).text);
                        }
                        if (
                            member.initializer.kind === ts.SyntaxKind.StringLiteral ||
                            member.initializer.kind === ts.SyntaxKind.JsxText
                        ) {
                            value = String((member.initializer as any).text);
                        }
                    }
                    members.push({
                        name: String((member.name as any).text),
                        value,
                    });
                });
            }
            if (e.name) {
                let enumInstance: EnumDeclaration = {
                    name: e.name.text,
                    members: members,
                    decorators: [],
                    content: content.substring(e.getStart(), e.getEnd()),
                    isExported: false,
                    start: e.getStart(),
                    end: e.getEnd(),
                    documentation: [],
                    namespace: getNamespace(e.getStart()),
                    extends: []
                };
                let jsDocTxt: string[] = [];
                const decorators = ts.canHaveDecorators(e) ? ts.getDecorators(e) : undefined;
                if (decorators) {
                    enumInstance.decorators = decorators.map((el: ts.Decorator) => buildDecorator(el.expression));
                }
                if (e["jsDoc"]) {
                    for (let jsDoc of e["jsDoc"]) {
                        jsDocTxt.push(jsDoc.comment);
                    }
                }
                enumInstance.documentation = jsDocTxt;
                if (e.modifiers) {
                    e.modifiers.forEach(x => {
                        if (x.kind === ts.SyntaxKind.AbstractKeyword) {
                        } else if (x.kind === ts.SyntaxKind.ExportKeyword) {
                            enumInstance.isExported = true;
                        }
                        else if (x.kind === ts.SyntaxKind.PrivateKeyword) { }
                        else if (x.kind == ts.SyntaxKind.DeclareKeyword) { }
                        else {
                            throw new Error("Unknown token enum modifiers " + x.kind);
                        }
                    });
                }
                module.enumDeclarations.push(enumInstance);
            }
        }

        var isInterface = x.kind === ts.SyntaxKind.InterfaceDeclaration;
        var isClass = x.kind === ts.SyntaxKind.ClassDeclaration;
        if (!isInterface && !isClass) {
            return;
        }
        var c: ts.ClassDeclaration = <ts.ClassDeclaration>x;
        if (c) {
            var fields: { [n: string]: FieldModel } = {};
            var clazz = classDecl(c.name?.text || '', isInterface);
            clazz.start = c.getStart();
            clazz.nameStart = c.name?.getStart() || 0;
            clazz.nameEnd = c.name?.getEnd() || 0;
            clazz.end = c.getEnd();
            clazz.content = content.substring(c.getStart(), c.getEnd());
            clazz.filePath = mpth;
            const decorators = ts.canHaveDecorators(c) ? ts.getDecorators(c) : undefined;
            if (decorators) {
                clazz.decorators = decorators.map((el: ts.Decorator) => buildDecorator(el.expression));
            }

            clazz.namespace = getNamespace(c.getStart());
            let jsDocTxt: string[] = [];
            if (c["jsDoc"]) {
                for (let jsDoc of c["jsDoc"]) {
                    jsDocTxt.push(jsDoc.comment);
                }
            }
            clazz.documentation = jsDocTxt;
            module.classes.push(clazz);
            c.members.forEach(x => {
                if (x.kind === ts.SyntaxKind.Constructor) {
                    var ct = <ts.ConstructorDeclaration>x;
                    let regexMatch = /{((\s|\S)*)}/g.exec(content.substring(ct.body?.getStart() || 0, ct.body?.getEnd()));
                    if (regexMatch) {
                        clazz.constructorBody = regexMatch[1];
                    }
                }
                if (x.kind === ts.SyntaxKind.MethodDeclaration) {
                    var md = <ts.MethodDeclaration>x;
                    var method = buildMethod(md, content, mpth, module);
                    clazz.methods.push(method);
                    //return;
                }
                var field: ts.PropertyDeclaration = fld.doMatch(x);
                if (field) {
                    var f = buildField(field, mpth, module);
                    if (f.name !== "override") {
                        if (f.name === "$") {
                            clazz.annotations = f.annotations;
                        } else {
                            fields[f.name] = f;
                            clazz.fields.push(f);
                        }
                    }
                }
            });
            if (c.typeParameters) {
                c.typeParameters.forEach(x => {
                    clazz.typeParameters.push(x.name["text"]);
                    if (!x.constraint) {
                        clazz.typeParameterConstraint.push('');
                    } else {
                        clazz.typeParameterConstraint.push(x.constraint["typeName"] ? x.constraint["typeName"]["text"] : null);
                    }
                });
            }
            if (c.heritageClauses) {
                c.heritageClauses.forEach(x => {
                    x.types.forEach(y => {
                        if (x.token === ts.SyntaxKind.ExtendsKeyword) {
                            let temp = buildType(y, mpth, module);
                            if (temp) {
                                temp.typeName = y.getText();
                            }
                            if (temp?.typeKind == TypeKind.BASIC) {
                                updateImport(temp as BasicType, module);
                            }
                            if (temp) {
                                clazz.extends.push(temp);
                            }
                        } else {
                            if (x.token === ts.SyntaxKind.ImplementsKeyword) {
                                let temp = buildType(y, mpth, module);
                                if (temp?.typeKind == TypeKind.BASIC) {
                                    updateImport(temp as BasicType, module);
                                }
                                if (temp) {
                                    clazz.implements.push(temp);
                                }
                            } else {
                                throw new Error("Unknown token class heritage");
                            }
                        }
                    });
                });
            }
            if (c.modifiers) {
                c.modifiers.forEach(x => {
                    if (x.kind === ts.SyntaxKind.AbstractKeyword) {
                        clazz.isAbstract = true;
                    } else if (x.kind === ts.SyntaxKind.ExportKeyword) {
                        clazz.isExported = true;
                    }
                    else if (x.kind === ts.SyntaxKind.PrivateKeyword) { }
                    else if (x.kind == ts.SyntaxKind.DeclareKeyword) { }
                    else if (x.kind == ts.SyntaxKind.Decorator) {
                    } else {
                        throw new Error("Unknown token class modifiers " + x.kind);
                    }
                });
            }
            return tsm.Matching.SKIP;
        }
        return;
    });
    return module;
}
function buildField(f: ts.PropertyDeclaration, path: string, module: Module): FieldModel {
    let jsDocTxt: string[] = [];
    if (f['jsDoc']) {
        for (let jsDoc of f['jsDoc']) {
            jsDocTxt.push(jsDoc.comment);
        }
    }
    const decorators = ts.canHaveDecorators(f) ? ts.getDecorators(f) : undefined;
    let field: FieldModel = {
        name: f.name["text"],
        type: buildType(f.type, path, module),
        annotations: [],
        documentation: jsDocTxt,
        valueConstraint: buildConstraint(f.initializer),
        optional: f.questionToken != null,
        decorators: (decorators) ? decorators.map((el: ts.Decorator) => buildDecorator(el.expression)) : [],
        start: f.getStart(),
        end: f.getEnd(),
        isPrivate: false,
        isStatic: false
    };
    if (f.modifiers) {
        f.modifiers.forEach(x => {
            let nothingToDo = [
                ts.SyntaxKind.ReadonlyKeyword,
                ts.SyntaxKind.ConstKeyword,
                ts.SyntaxKind.OverrideKeyword,
                ts.SyntaxKind.AbstractKeyword,
                ts.SyntaxKind.PublicKeyword,
                ts.SyntaxKind.Decorator,
                ts.SyntaxKind.AsyncKeyword
            ]
            if (x.kind === ts.SyntaxKind.StaticKeyword) {
                field.isStatic = true;
            } else if (x.kind === ts.SyntaxKind.PrivateKeyword) {
                field.isPrivate = true;
            } else if (x.kind === ts.SyntaxKind.ProtectedKeyword) {
                field.isPrivate = true;
            }
            else if (nothingToDo.indexOf(x.kind) != -1) { }
            else {
                throw new Error("Unknown token field modifiers " + x.kind);
            }
        });
    }
    return field;
}

function buildMethod(md: ts.MethodDeclaration, content: any, path: string, module: Module): MethodModel {
    var aliasName = (<ts.Identifier>md.name).text;
    var text = content.substring(md.getStart(), md.getEnd());
    var params: ParameterModel[] = [];
    md.parameters.forEach(x => {
        params.push(buildParameter(x, content, path, module));
    });
    let jsDocTxt: string[] = [];
    if (md['jsDoc']) {
        for (let jsDoc of md['jsDoc']) {
            jsDocTxt.push(jsDoc.comment);
        }
    }
    const decorators = ts.canHaveDecorators(md) ? ts.getDecorators(md) : undefined;
    var method: MethodModel = {
        returnType: buildType(md.type, path, module),
        name: aliasName,
        start: md.getStart(),
        end: md.getEnd(),
        content: text,
        arguments: params,
        isAbstract: false,
        isStatic: false,
        isAsync: false,
        isPrivate: false,
        documentation: jsDocTxt,
        decorators: (decorators) ? decorators.map((el: ts.Decorator) => buildDecorator(el.expression)) : [],
    };

    if (md.modifiers) {
        md.modifiers.forEach(x => {
            if (x.kind === ts.SyntaxKind.AbstractKeyword) {
                method.isAbstract = true;
            } else if (x.kind === ts.SyntaxKind.StaticKeyword) {
                method.isStatic = true;
            } else if (x.kind === ts.SyntaxKind.AsyncKeyword) {
                method.isAsync = true;
            } else if (x.kind === ts.SyntaxKind.PrivateKeyword) {
                method.isPrivate = true;
            } else if (x.kind === ts.SyntaxKind.ProtectedKeyword) {
                method.isPrivate = true;
            } else if (x.kind === ts.SyntaxKind.OverrideKeyword) { }
            else if (x.kind === ts.SyntaxKind.PublicKeyword) { }
            else if (x.kind === ts.SyntaxKind.Decorator) { }
            else {
                throw new Error("Unknown token method modifiers " + x.kind);
            }
        });
    }
    return method;
}

function buildParameter(f: ts.ParameterDeclaration, content: any, path: string, module: Module): ParameterModel {
    var text = content.substring(f.getStart(), f.getEnd());
    let defaultValue = f.initializer?.getText();
    return {
        name: f.name["text"],
        start: f.getStart(),
        end: f.getEnd(),
        text: text,
        defaultValue: defaultValue,
        type: buildType(<ts.TypeNode>f.type, path, module)
    };
}

function buildConstraint(e: ts.Expression | undefined): Constraint | undefined {
    if (!e) {
        return undefined;
    }
    if (e.kind === ts.SyntaxKind.CallExpression) {
        return {
            isCallConstraint: true,
            value: buildAnnotation(e)
        };
    } else {
        return {
            isCallConstraint: false,
            value: parseArg(e)
        };
    }

}
function buildInitializer(i: ts.Expression | undefined): Annotation[] {
    if (!i) {
        return [];
    }
    if (i.kind === ts.SyntaxKind.ArrayLiteralExpression) {
        var arr = <ts.ArrayLiteralExpression>i;
        var annotations: Annotation[] = [];
        arr.elements.forEach(x => {
            annotations.push(buildAnnotation(x));
        });
        return annotations;
    } else {
        throw new Error("Only Array Literals supported now");
    }
}
function buildAnnotation(e: ts.Expression): Annotation {
    if (e.kind === ts.SyntaxKind.CallExpression) {
        var call: ts.CallExpression = <ts.CallExpression>e;
        var name = parseName(call.expression);
        var a: { name: string, arguments: any[] } = {
            name: name,
            arguments: []
        };
        call.arguments.forEach(x => {
            a.arguments.push(parseArg(x));
        });
        return a;
    } else {
        throw new Error("Only call expressions may be annotations");
    }
}

function buildDecorator(e: ts.Expression): Decorator {
    if (e.kind === ts.SyntaxKind.CallExpression) {
        var call: ts.CallExpression = <ts.CallExpression>e;
        var name = parseName(call.expression);
        var a: { name: string, arguments: any[], start: number, end: number } = {
            name: name,
            arguments: [],
            start: e.getStart(),
            end: e.getEnd(),
        };
        call.arguments.forEach(x => {
            a.arguments.push(parseArg(x));
        });
        return a;
    } else if (e.kind === ts.SyntaxKind.Identifier) {
        return {
            name: String((e as any).escapedText),
            arguments: [],
            start: e.getStart(),
            end: e.getEnd(),
        };
    } else {
        throw new Error("Only call expressions may be annotations");
    }
}
export function parseArg(n: ts.Expression): any {
    if (n.kind === ts.SyntaxKind.StringLiteral) {
        var l: ts.StringLiteral = <ts.StringLiteral>n;

        return l.text;
    }
    if (n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
        var ls: ts.LiteralExpression = <ts.LiteralExpression>n;

        return ls.text;
    }
    if (n.kind === ts.SyntaxKind.ArrayLiteralExpression) {
        var arr = <ts.ArrayLiteralExpression>n;
        var annotations: any[] = [];
        arr.elements.forEach(x => {
            annotations.push(parseArg(x));
        });
        return annotations;
    }
    if (n.kind === ts.SyntaxKind.TrueKeyword) {
        return true;
    }
    if (n.kind === ts.SyntaxKind.PropertyAccessExpression) {
        var pa = <ts.PropertyAccessExpression>n;
        return parseArg(pa.expression) + "." + parseArg(pa.name);
    }
    if (n.kind === ts.SyntaxKind.Identifier) {
        var ident = <ts.Identifier>n;
        return ident.text;
    }
    if (n.kind === ts.SyntaxKind.FalseKeyword) {
        return false;
    }
    if (n.kind === ts.SyntaxKind.NumericLiteral) {
        var nl: ts.LiteralExpression = <ts.LiteralExpression>n;


        return Number(nl.text);
    }
    if (n.kind === ts.SyntaxKind.BinaryExpression) {
        var bin: ts.BinaryExpression = <ts.BinaryExpression>n;
        if (bin.operatorToken.kind == ts.SyntaxKind.PlusToken) {
            return parseArg(bin.left) + parseArg(bin.right);
        }
    }

    if (n.kind === ts.SyntaxKind.ObjectLiteralExpression) {
        const obj: ts.ObjectLiteralExpression = <ts.ObjectLiteralExpression>n;
        let res: any = null;
        try {
            return JSONTransformer.toValidateView(obj);
        } catch (e) {
            console.log(`Can't parse string "${obj.getFullText()}"`);
        }
        return {};
    }
    if (n.kind === ts.SyntaxKind.ArrowFunction) {
        //mock for arrow function
        return (<ts.ArrowFunction>n).getText();
    }

    if (n.kind === ts.SyntaxKind.NullKeyword) {
        return null;
    }
    return n.getText();
    //throw new Error("Unknown value in annotation");
}

function parseName(n: ts.Expression): string {
    if (n.kind === ts.SyntaxKind.Identifier) {
        return n["text"];
    }
    if (n.kind === ts.SyntaxKind.PropertyAccessExpression) {
        var m: ts.PropertyAccessExpression = <ts.PropertyAccessExpression>n;
        return parseName(m.expression) + "." + parseName(m.name);
    }
    if (n.kind == ts.SyntaxKind.ThisKeyword) {
        return "this";
    }
    throw new Error("Only simple identifiers are supported now");
}


function basicType(n: string, path: string | null): BasicType {
    var namespaceIndex = n.indexOf(".");
    var namespace = namespaceIndex !== -1 ? n.substring(0, namespaceIndex) : "";
    var basicName = namespaceIndex !== -1 ? n.substring(namespaceIndex + 1) : n;



    return { typeName: n, nameSpace: namespace, basicName: basicName, typeKind: TypeKind.BASIC, typeArguments: [], modulePath: path || '' };
}
function arrayType(b: TypeModel): ArrayType {
    return { base: b, typeKind: TypeKind.ARRAY, typeName: '' };
}
function unionType(b: TypeModel[]): UnionType {
    return { options: b, typeKind: TypeKind.UNION, typeName: '' };
}
export function buildType(t: ts.TypeNode | undefined, path: string, module: Module): TypeModel | undefined {
    if (!t) {
        return undefined;
    }
    if (t.kind === ts.SyntaxKind.StringKeyword) {
        return basicType("string", null);
    }
    if (t.kind === ts.SyntaxKind.NumberKeyword) {
        return basicType("number", null);
    }
    if (t.kind === ts.SyntaxKind.BooleanKeyword) {
        return basicType("boolean", null);
    }
    if (t.kind === ts.SyntaxKind.NullKeyword) {
        return basicType("null", null);
    }
    if (t.kind === ts.SyntaxKind.AnyKeyword) {
        return basicType("any", null);
    }
    if (t.kind === ts.SyntaxKind.VoidKeyword) {
        return basicType("void", null);
    }
    if (t.kind === ts.SyntaxKind.LiteralType) {
        let literalType = basicType("literal", null);
        let literalNode: ts.LiteralTypeNode = t as ts.LiteralTypeNode;
        literalType.basicName = literalNode.literal.getText();
        return literalType;
    }

    if (t.kind === ts.SyntaxKind.TypeReference) {
        var tr: ts.TypeReferenceNode = <ts.TypeReferenceNode>t;
        let parsedName = parseQualified(tr.typeName);
        if (parsedName) {
            var res = basicType(parsedName, path);

            for (let _import of module._imports) {
                if (_import.clauses.indexOf(res.typeName) != -1) {
                    res.modulePath = _import.absPathString;
                }
            }

            if (tr.typeArguments) {
                tr.typeArguments.forEach(x => {
                    let temp = buildType(x, path, module);
                    if (temp) {
                        res.typeArguments.push(temp);
                    }
                });
            }
            return res;
        }
    }
    if (t.kind === ts.SyntaxKind.ArrayType) {
        var q: ts.ArrayTypeNode = <ts.ArrayTypeNode>t;
        let temp = buildType(q.elementType, path, module);
        if (temp) {
            return arrayType(temp);
        }

    }
    if (t.kind === ts.SyntaxKind.UnionType) {
        var ut: ts.UnionTypeNode = <ts.UnionTypeNode>t;
        let types: TypeModel[] = [];
        for (let type of ut.types) {
            let temp = buildType(type, path, module);
            if (temp) {
                types.push(temp);
            }
        }
        return unionType(types);
    }
    if (t.kind === ts.SyntaxKind.ExpressionWithTypeArguments) {
        var tra = <ts.ExpressionWithTypeArguments>t;
        let parsedName2 = tra.expression.getText();
        let parsedName = parseQualified2(tra.expression);
        if (parsedName2) {
            res = basicType(parsedName2, path);
            if (tra.typeArguments) {
                tra.typeArguments.forEach(x => {
                    let temp = buildType(x, path, module);
                    if (temp) {
                        res.typeArguments.push(temp);
                    }
                });
            }
            return res;
        }
    } else {
        return basicType("mock", null);
    }
    return;
    //throw new Error("Case not supported: " + t.kind);
}
function parseQualified2(n: any): string | undefined {
    let preset = "";
    if (n.expression && n.expression.kind === ts.SyntaxKind.Identifier) {
        preset = n.expression.text + "."
    }
    if (!n.name) {
        return preset + n.text;
    }
    return preset + n.name.text;
}
function parseQualified(n: ts.EntityName): string | undefined {
    if (n.kind === ts.SyntaxKind.Identifier) {
        return n["text"];
    } else {
        var q = <ts.QualifiedName>n;
        return parseQualified(q.left) + "." + parseQualified(q.right);
    }
}
function updateImport(type: BasicType, module: Module): void {
    for (let _import of module._imports) {
        if (!_import.isNodeModule) {
            for (let clause of _import.clauses) {
                if (clause == type.typeName) {
                    type.modulePath = _import.absPathString;
                    return;
                }
            }
        }
    }
    type.modulePath = '';
}