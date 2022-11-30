import { window } from 'vscode';
import { BuildQuickPick } from '../../quickPick';

export class ImportViewElement {
	static cmd: string = "aventus.wc.import.viewElement";

	public static async middleware(args: any[]): Promise<any[]> {
		return args;
	}
}