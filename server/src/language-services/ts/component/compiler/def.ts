import { Diagnostic } from 'vscode-languageserver';
import { ClassModel, FieldModel } from '../../../../ts-file-parser';
import { HTMLDoc } from '../../../html/helper/definition';
import { CustomCssProperty, SCSSDoc } from '../../../scss/helper/CSSNode';

export type CompilerClassInfo = ClassModel & CustomClassInfo;
export interface CompileComponentResult {
	diagnostics: Diagnostic[],
	writeCompiled: Boolean,
	result: {
		nameCompiled: string[],
		nameDoc: string[],
		src: string,
		doc: string,
		debug: string,
		dependances: string[],
		htmlDoc: HTMLDoc,
		scssDoc: SCSSDoc
	}
}

declare type FieldType = 'Attribute' | 'Property' | 'Watch' | 'State' | 'ViewElement' | 'Simple';
export interface CustomFieldModel extends FieldModel {
	propType: FieldType,
	inParent: boolean,
	arguments?: any[],
}
declare interface DebuggerConfig {
	writeCompiled?: boolean,
	enableWatchHistory?: boolean,
}
export declare interface CustomClassInfo {
	debuggerOption: DebuggerConfig,
	overrideView?: boolean
}
export declare interface ItoPrepare {
	variablesInView: {},
	eventsPerso: toPrepareEventPerson[],
	pressEvents: {},
	allFields: { [key: string]: CustomFieldModel },
	loop: {},
	actionByComponent: { [key: string]: toPrepareActionByComponent[] },
	idElement: 0,
	style: string,
	script: ClassModel & CustomClassInfo,
	view: string,

}
export declare interface toPrepareActionByComponent {
	componentId: string,
	prop?: string,
	value: string
}
export declare interface toPrepareEventPerson {
	componentId: string,
	value: string,
	event: string
}



export const configTS = {
	"noImplicitOverride": false,
	"target": "ES6"
}
export type CustomTypeAttribute = "luxon.date" | 'luxon.datetime' | 'string' | 'number' | 'boolean';
export const TYPES = {
	date: 'luxon.date',
	datetime: 'luxon.datetime',
	string: 'string',
	number: 'number',
	boolean: 'boolean',
	literal: 'literal'
}

