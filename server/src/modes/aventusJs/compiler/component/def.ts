import { Diagnostic } from 'vscode-languageserver';
import { ClassModel, FieldModel } from '../../../../ts-file-parser';
import { customCssProperty } from '../../../aventusSCSS/CSSNode';


export interface CompileComponentResult {
	success: boolean,
	diagnostics: Diagnostic[],
	result: {
		nameCompiled: string,
		nameDoc: string,
		src: string,
		doc: string,
		dependances: string[],
		htmlDoc: HTMLDoc,
		scssVars: SCSSDoc
	}
}

declare type FieldType = 'attribute' | 'property' | 'watch' | 'state' | 'viewElement' | 'simple';
export interface CustomFieldModel extends FieldModel {
	propType: FieldType,
	inParent: boolean,
	arguments?: any[],
}
declare interface DebuggerConfig {
	writeCompiled?: boolean
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
export declare interface HTMLDoc {
	[key: string]: {
		name: string,
		description: string,
		attributes: {
			[key: string]: {
				name: string,
				description: string,
				values: {
					name: string,
					description: string,
				}[]
			}
		}
	}
}
export declare interface SCSSDoc {
	[key: string]: customCssProperty[],
}

/** @type {ts.CompilerOptions} */
export const configTS = {
	"noImplicitOverride": false,
	"target": "ES6"
}
export const TYPES = {
	date: 'date',
	datetime: 'datetime',
	string: 'string',
	number: 'number',
	boolean: 'boolean',
}

