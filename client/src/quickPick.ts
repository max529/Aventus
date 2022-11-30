import { QuickInputButton, QuickPickItem, QuickPickItemKind } from 'vscode';

export class BuildQuickPick implements QuickPickItem {
	label: string;
	kind?: QuickPickItemKind;
	description?: string;
	detail?: string;
	picked?: boolean;
	alwaysShow?: boolean;
	buttons?: readonly QuickInputButton[];

	constructor(label, detail) {
		this.label = label;
		this.detail = detail;
	}
}

export namespace QuickPick {
	export const createOptions: BuildQuickPick[] = [
		new BuildQuickPick("Init", "Create a project"),
		new BuildQuickPick("Component", "Create a component"),
		new BuildQuickPick("Data", "Create a data"),
		new BuildQuickPick("Library", "Create a library"),
		new BuildQuickPick("RAM", "Create a RAM"),
	];
	export const componentFormat: BuildQuickPick[] = [
		new BuildQuickPick("Single", "Single file"),
		new BuildQuickPick("Multiple", "Splitted files"),
	];

	export const attrType: BuildQuickPick[] = [
		new BuildQuickPick("Number", "number"),
		new BuildQuickPick("String", "string"),
		new BuildQuickPick("Boolean", "boolean"),
		new BuildQuickPick("Date", "luxon.Date"),
		new BuildQuickPick("Datetime", "luxon.Datetime"),
		new BuildQuickPick("Custom", ""),
	];

	export function reorder(list: BuildQuickPick[], selected: BuildQuickPick) {
		let indexResult = list.indexOf(selected);
		if (indexResult > -1) {
			list.splice(indexResult, 1);
		}
		list.splice(0, 0, selected);
	}
}