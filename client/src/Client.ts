import { join } from "path";
import { ExtensionContext } from "vscode";
import { ExecuteCommandSignature, LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient";
import { Commands } from "./cmds";
import { AvenutsVsComponent } from "./component";
import { Notifications } from "./notification";

export class Client {
    private _context: ExtensionContext | undefined = undefined;
    private client: LanguageClient | undefined = undefined;
    public components: AvenutsVsComponent | undefined = undefined;

    public get context() {
        return this._context;
    }

    public init(context: ExtensionContext) {
        this.components = new AvenutsVsComponent();
        this._context = context;
        let serverOptions = this.createServerOption(context.asAbsolutePath(
            join('server', 'out', 'server.js')
        ));
        this.client = new LanguageClient('Aventus', 'Aventus', serverOptions, this.createClientOption());
        this.client.onReady().then(() => {
            this.addNotification();
        })

        // Start the client. This will also launch the server
        context.subscriptions.push(this.client.start());
    }
    public stop(): Thenable<void> | undefined {
        if (this.client) {
            return this.client.stop();
        }
        return undefined;
    }

    private createServerOption(serverEntryPath: string): ServerOptions {
        // The debug options for the server
        // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
        const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        return {
            run: { module: serverEntryPath, transport: TransportKind.ipc, },
            debug: {
                module: serverEntryPath,
                transport: TransportKind.ipc,
                options: debugOptions
            }
        };
    }
    private createClientOption(): LanguageClientOptions {
        return {
            // Register the server for plain text documents
            documentSelector: [
                { scheme: 'file', language: "Aventus Ts" },
                { scheme: 'file', language: "Aventus HTML" },
                { scheme: 'file', language: 'Aventus SCSS' },
                { scheme: 'file', language: 'Aventus WebComponent' },
            ],
            middleware: {
                executeCommand: async (command, args, next) => {
                    next(command, await this.commandMiddleware(command, args));
                },
                provideCodeActions(this, document, range, context, token, next) {
                    return next(document, range, context, token);
                },

            },


        };
    }

    private async commandMiddleware(command: string, args: any[]): Promise<any[]> {
        if (Commands.allCommandes[command]) {
            args = await Commands.allCommandes[command].middleware(args);
        }
        return args;
    }

    private addNotification() {
        if (this.client) {
            for (let cmdName in Notifications.allNotifications) {
                this.client.onNotification(cmdName, Notifications.allNotifications[cmdName].action);
            }
        }
    }
}