import { InputBoxValidationMessage, window } from 'vscode';
import { QuickPick } from '../../quickPick';

export class CreateAttribute {
	static cmd: string = "aventus.wc.create.attribute";

	public static async middleware(args: any[]): Promise<any[]> {
		let result: (string | number)[] = [];

		if (window.activeTextEditor) {
			let uri = "";
			if (args.length > 0) {
				uri = "file://" + args[0].path.replace(":", "%3A");
			}
			else {
				// use command with key binding
				uri = window.activeTextEditor.document.uri.toString();
			}

			if (uri != "") {
				result.push(uri);
				const name = await window.showInputBox({
					title: "Provide a name for your Attribute",
					async validateInput(value) {
						if (value != value.toLowerCase()) {
							return 'An attribute must be in lower case';
						}
						return null;
					},
				});
				if (name !== undefined) {
					result.push(name);

					const type = await window.showQuickPick(QuickPick.attrType, {
						placeHolder: 'Choose a type?',
						canPickMany: false,
					});
					if (type !== undefined && type.detail !== undefined) {
						QuickPick.reorder(QuickPick.attrType, type);
						result.push(type.detail);

						let activeEditor = window.activeTextEditor;
						let document = activeEditor.document;
						let curPos = activeEditor.selection.active;
						result.push(document.offsetAt(curPos));
					}


				}
			}
		}
		return result;
	}
}