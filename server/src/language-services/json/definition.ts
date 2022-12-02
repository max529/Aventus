import { CompilerOptions, FormatCodeSettings, GetCompletionsAtPositionOptions, IndentStyle, JsxEmit, ModuleResolutionKind, ScriptTarget, SemicolonPreference } from 'typescript';


export const compilerOptions: CompilerOptions = {
	allowNonTsExtensions: true,
	jsx: JsxEmit.None,
	importHelpers: false,
	allowJs: true,
	checkJs: false,
	lib: ['lib.es2022.full.d.ts'],
	target: ScriptTarget.ES2022,
	moduleResolution: ModuleResolutionKind.Classic,
	experimentalDecorators: true,
	noImplicitOverride: true,
	strictPropertyInitialization: true,
	noImplicitReturns: true,
};
export const completionOptions: GetCompletionsAtPositionOptions = {
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
export const formatingOptions: FormatCodeSettings = {
	convertTabsToSpaces: true,
	tabSize: 4,
	indentSize: 4,
	indentStyle: IndentStyle.Smart,
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
	semicolons: SemicolonPreference.Insert,
	insertSpaceBeforeTypeAnnotation: false,
}

export interface AventusConfigBuild {
	name: string,
	version: string,
	inputPath: string[],
	inputPathRegex: RegExp,
	outsideModulePath: string[],
	outsideModulePathRegex: RegExp,
	outputFile: string,
	generateDefinition: boolean
	includeBase: boolean,
	includeOnBuild: string[],
	module: string,
	componentPrefix: string,
	namespaceStrategy: 'manual' | 'followFolders' | 'rules'
	namespaceRules: { [namespace: string]: string[] }
	namespaceRulesRegex: { [namespace: string]: RegExp }
}
export interface AventusConfigStatic {
	name: string,
	inputPath: string,
	inputPathFolder: string,
	outputPath: string
	outputPathFolder: string,
	exportOnChange?: boolean,
	colorsMap?: { [key: string]: string }
}
export interface AventusConfig {
	version: string,
	componentPrefix: string
	module: string;
	build: AventusConfigBuild[],
	static: AventusConfigStatic[],
	include: { definition: string, name: string, src?: string }[]
}