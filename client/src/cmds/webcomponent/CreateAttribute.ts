import { window } from 'vscode';

export class CreateAttribute {
	static cmd: string = "aventus.wc.create.attribute";

	public static async middleware(args: any[]): Promise<any[]> {
		const name = await window.showInputBox({
			title: "Provide a name for your Attribute",
		});
		if (name) {
			args.push(name);
		}
		return args;
	}
}