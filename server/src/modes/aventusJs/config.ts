import * as ts from 'typescript';


export const compilerOptions: ts.CompilerOptions = {
	allowNonTsExtensions: true,
	jsx: ts.JsxEmit.None,
	importHelpers: false,
	allowJs: true,
	checkJs: false,
	lib: ['lib.es2022.full.d.ts'],
	target: ts.ScriptTarget.ES2022,
	moduleResolution: ts.ModuleResolutionKind.Classic,
	experimentalDecorators: true,
	noImplicitOverride: true,
	strictPropertyInitialization: true,
	noImplicitReturns: true,
};
export const completionOptions: ts.GetCompletionsAtPositionOptions = {
	includeExternalModuleExports: true,
	includeInsertTextCompletions: true,
	includeCompletionsWithClassMemberSnippets: true,
	includeAutomaticOptionalChainCompletions: true,
	includeCompletionsForImportStatements: true,
	includeCompletionsForModuleExports: true,
	includeCompletionsWithInsertText: true,
	// includeCompletionsWithObjectLiteralMethodSnippets:true, => create double 
	// includeCompletionsWithSnippetText:true, => $0 appear in fct
	includeInlayEnumMemberValueHints: true,
	includeInlayFunctionLikeReturnTypeHints: true,
	includeInlayFunctionParameterTypeHints: true,
	includeInlayParameterNameHints: "all",
	includeInlayParameterNameHintsWhenArgumentMatchesName: true,
	includeInlayPropertyDeclarationTypeHints: true,
	//includeInlayVariableTypeHints:true,
	useLabelDetailsInCompletionEntries: true,
	importModuleSpecifierEnding: "index",
	importModuleSpecifierPreference: "relative",
}
export const formatingOptions: ts.FormatCodeSettings = {
	convertTabsToSpaces: true,
	tabSize: 4,
	indentSize: 4,
	indentStyle: ts.IndentStyle.Smart,
	newLineCharacter: '\n',
	baseIndentSize: 0,
	insertSpaceAfterCommaDelimiter: true,
	insertSpaceAfterConstructor: false,
	insertSpaceAfterSemicolonInForStatements: true,
	insertSpaceBeforeAndAfterBinaryOperators: true,
	insertSpaceAfterKeywordsInControlFlowStatements: false,
	insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
	insertSpaceBeforeFunctionParenthesis: false,
	// insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: true,
	// insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: true,
	// insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
	// insertSpaceAfterOpeningAndBeforeClosingEmptyBraces: true,
	// insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: true,
	// insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: true,
	insertSpaceAfterTypeAssertion: true,
	placeOpenBraceOnNewLineForControlBlocks: false,
	placeOpenBraceOnNewLineForFunctions: false,
	semicolons: ts.SemicolonPreference.Insert,
	insertSpaceBeforeTypeAnnotation: false,
}

export interface AventusConfigBuild {
	name: string,
	version: string,
	inputPath: string[],
	inputPathRegex?: RegExp
	outputFile: string,
	generateDefinition?: boolean
	compileOnSave?: boolean
	includeBase?: boolean,
	include?: { definition: string, src?: string, libraryName?: string }[],
	namespace: "",
}
export interface AventusConfigStatic {
	name: string,
	inputPath: string,
	inputPathFolder: string,
	outputPath: string
	outputPathFolder: string,
	colorsMap?: { [key: string]: string }
}
export interface AventusConfig {
	identifier: string,
	components?: {
		disableIdentifier: boolean
	},
	libs?: {
		disableIdentifier: boolean
	},
	data?: {
		disableIdentifier: boolean
	},
	ram?: {
		disableIdentifier: boolean
	}
	build: AventusConfigBuild[],
	static?: AventusConfigStatic[],
}