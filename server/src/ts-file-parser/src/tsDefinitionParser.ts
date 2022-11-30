/**
 * Created by kor on 08/05/15.
 */

import * as ts from "typescript";
import * as tsm from "./tsASTMatchers";
export * as tsm from "./tsASTMatchers";
import { JSONTransformer } from "./jsonTransformer";



function parse(content: string) {
	return ts.createSourceFile("sample.ts", content, ts.ScriptTarget.ES3, true);
}
var fld = tsm.Matching.field();

interface TypeInfo {
	start: number,
	end: number,
	name: string
}
let allChanges: {
	start: number,
	end: number,
	value: string
}[] = [];
let typeToFullname: { [type: string]: string } = {};



export function correctTypeInsideDefinition(content: string, types: { [type: string]: string }): string {
	var mod = parse(content);
	allChanges = [];
	typeToFullname = types;

	tsm.Matching.visit(mod, x => {
		var isInterface = x.kind === ts.SyntaxKind.InterfaceDeclaration;
		var isClass = x.kind === ts.SyntaxKind.ClassDeclaration;
		if (!isInterface && !isClass) {
			return;
		}
		var c: ts.ClassDeclaration = <ts.ClassDeclaration>x;
		if (c) {
			c.members.forEach(x => {
				if (x.kind === ts.SyntaxKind.MethodDeclaration) {
					var md = <ts.MethodDeclaration>x;
					if (md.type) {
						correctType(md.type)
					}
					if (md.typeParameters) {
						md.typeParameters.forEach(x => {
							if (x.constraint) {
								correctType(x.constraint)
							}
						});
					}
					md.parameters.forEach(x => {
						correctType(<ts.TypeNode>x.type)
					});
				}
				var field: ts.PropertyDeclaration = fld.doMatch(x);
				if (field && field.type) {
					correctType(field.type);
				}
			});
			if (c.typeParameters) {
				c.typeParameters.forEach(x => {
					if (x.constraint) {
						correctType(x.constraint)
					}
				});
			}
			if (c.heritageClauses) {
				c.heritageClauses.forEach(x => {
					x.types.forEach(y => {
						if (x.token === ts.SyntaxKind.ExtendsKeyword) {
							correctType(y);
						} else if (x.token === ts.SyntaxKind.ImplementsKeyword) {
							correctType(y);
						} else {
							throw new Error("Unknown token class heritage");
						}

					});
				});
			}
			return tsm.Matching.SKIP;
		}
		return;
	});

	allChanges.sort((a, b) => b.end - a.end); // order from end file to start file
	for (let change of allChanges) {
		content = content.slice(0, change.start) + change.value + content.slice(change.end, content.length);
	}
	return content;
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
			//throw new Error(`Can't parse string "${obj.getFullText()}" to json`);
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



function addChange(name: string, start: number, end: number) {
	if (typeToFullname[name]) {
		allChanges.push({
			start,
			end,
			value: typeToFullname[name]
		})
	}
}

function correctType(t: ts.TypeNode): void {
	if (t.kind === ts.SyntaxKind.TypeReference) {
		var tr: ts.TypeReferenceNode = <ts.TypeReferenceNode>t;
		let parsedName = parseQualified(tr.typeName);
		if (parsedName) {
			addChange(parsedName, tr.getStart(), tr.getEnd());

			if (tr.typeArguments) {
				tr.typeArguments.forEach(x => {
					let temp = correctType(x);
				});
			}
		}
	}
	else if (t.kind === ts.SyntaxKind.ArrayType) {
		var q: ts.ArrayTypeNode = <ts.ArrayTypeNode>t;
		let temp = correctType(q.elementType);

	}
	else if (t.kind === ts.SyntaxKind.UnionType) {
		var ut: ts.UnionTypeNode = <ts.UnionTypeNode>t;
		for (let type of ut.types) {
			correctType(type);
		}
	}
	else if (t.kind === ts.SyntaxKind.ExpressionWithTypeArguments) {
		var tra = <ts.ExpressionWithTypeArguments>t;
		let parsedName = parseQualified2(tra.expression);
		if (parsedName) {
			addChange(parsedName, tra.expression.getStart(), tra.expression.getEnd());
			if (tra.typeArguments) {
				tra.typeArguments.forEach(x => {
					correctType(x);
				});
			}
		}
	}
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
