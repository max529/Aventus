import { window } from 'vscode';
import { BuildQuickPick } from '../../quickPick';

export class CreateWatch {
	static cmd: string = "aventus.wc.create.watch";

	public static async middleware(args: any[]): Promise<any[]> {
		const name = await window.showInputBox({
			title: "Provide a name to watch",
		});
		if (name) {
			args.push(name);
			let toDisplay: BuildQuickPick[] = [];
			toDisplay.push(new BuildQuickPick("Yes", ""));
			toDisplay.push(new BuildQuickPick("No", ""));
			const result = await window.showQuickPick(toDisplay, {
				placeHolder: 'Do you need a callback function?',
				canPickMany: false,
			});
			if (result) {
				args.push(result);
			}
		}
		return args;
	}
}