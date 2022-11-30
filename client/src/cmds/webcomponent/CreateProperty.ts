import { window } from 'vscode';
import { BuildQuickPick } from '../../quickPick';

export class CreateProperty {
	static cmd: string = "aventus.wc.create.property";

	public static async middleware(args: any[]): Promise<any[]> {
		let result: string[] = [];
		if (args.length > 0) {
			let uri = "file://" + args[0].path.replace(":", "%3A");
			result.push(uri);

			const name = await window.showInputBox({
				title: "Provide a name for your Property",
			});
			if (name) {
				result.push(name);
				let toDisplay: BuildQuickPick[] = [];
				toDisplay.push(new BuildQuickPick("Yes", ""));
				toDisplay.push(new BuildQuickPick("No", ""));
				const yesOrNo = await window.showQuickPick(toDisplay, {
					placeHolder: 'Do you need a callback function?',
					canPickMany: false,
				});
				if (yesOrNo !== undefined) {
					result.push(yesOrNo.label);
				}
			}
		}
		return result;
	}
}