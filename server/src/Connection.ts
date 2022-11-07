import { createConnection, ProposedFeatures, PublishDiagnosticsParams, _, _Connection } from 'vscode-languageserver/node';
import { uriToPath } from './tools';




export class ClientConnection {
	private static instance: ClientConnection;
	public static getInstance(): ClientConnection {
		if (!this.instance) {
			this.instance = new ClientConnection();
		}
		return this.instance;
	}

	private _connection: _Connection<_, _, _, _, _, _, _> | undefined = undefined;
	public get connection() {
		return this._connection;
	}
	private constructor() {
		// create connection with vscode client
		if (!process.env["AVENTUS_CLI"]) {
			this._connection = createConnection(ProposedFeatures.all);
		}
	}


	public sendNotification(cmd: string, params: any) {
		this._connection?.sendNotification(cmd, params);
	}
	public showErrorMessage(msg) {
		if (this._connection) {
			this._connection.window.showErrorMessage(msg);
		}
		else {
			console.error(msg);
		}

	}
	public sendDiagnostics(params: PublishDiagnosticsParams) {
		if (this._connection) {
			this._connection?.sendDiagnostics(params)
		}
		else {
			let path = uriToPath(params.uri);
			for (let diagnostic of params.diagnostics) {
				console.log(path + ":" + diagnostic.range.start.line + ":" + diagnostic.range.start.character + " : " + diagnostic.message)
			}
		}
	}
}