import { window } from 'vscode';

export class AddConfigSection {
	static cmd: string = "aventus.addConfigSection";

	public static async middleware(args: any[]): Promise<any[]> {
		const name = await window.showInputBox({
			title: "Provide a name for your config section",
		});
		args.push(name);
		return args;
	}
}