
export class ImportViewElement {
	static cmd: string = "aventus.wc.import.viewElement";

	public static async middleware(args: any[]): Promise<any[]> {
		let result: string[] = [];
		if (args.length > 0) {
			let uri = "file://" + args[0].path.replace(":", "%3A");
			result.push(uri);
		}
		return result;
	}
}