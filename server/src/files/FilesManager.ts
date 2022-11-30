import { existsSync, lstatSync, readdirSync, readFileSync } from 'fs';
import { Hover } from 'vscode-languageclient';
import { CodeAction, CodeLens, CompletionItem, CompletionList, Definition, FormattingOptions, Location, Position, Range, TextEdit } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ClientConnection } from '../Connection';
import { AventusExtension, AventusLanguageId } from '../definition';
import { pathToUri, uriToPath } from '../tools';
import { AventusFile, InternalAventusFile } from './AventusFile';
import { v4 as randomUUID } from 'uuid';
import { ReferencedSymbol } from 'typescript';
import { Build } from '../project/Build';

export class FilesManager {
    private static instance: FilesManager;
    public static getInstance(): FilesManager {
        if (!this.instance) {
            this.instance = new FilesManager();
        }
        return this.instance;
    }
    private constructor() { }

    private files: { [uri: string]: InternalAventusFile } = {};

    public async loadAllAventusFiles(workspaces: string[]): Promise<void> {
        let configFiles: TextDocument[] = [];

        for (let i = 0; i < workspaces.length; i++) {
            let workspacePath = uriToPath(workspaces[i])
            /**
             * Loop between all workspaces to find all aventus files
             * @param workspacePath 
             */
            let readWorkspace = async (workspacePath) => {
                let folderContent = readdirSync(workspacePath);
                for (let i = 0; i < folderContent.length; i++) {
                    let currentPath = workspacePath + '/' + folderContent[i];
                    if (lstatSync(currentPath).isDirectory()) {
                        if (folderContent[i] != "node_modules") {
                            await readWorkspace(currentPath);
                        }
                    } else {
                        if (folderContent[i] == AventusExtension.Config) {
                            configFiles.push(TextDocument.create(pathToUri(currentPath), AventusLanguageId.TypeScript, 0, readFileSync(currentPath, 'utf8')));
                        }
                        else if (folderContent[i].endsWith(AventusExtension.Base)) {
                            let textDoc = TextDocument.create(pathToUri(currentPath), AventusLanguageId.HTML, 0, readFileSync(currentPath, 'utf8'));
                            await this.registerFile(textDoc);
                        }
                    }
                }
            }
            await readWorkspace(workspacePath);
        }
        for (let configFile of configFiles) {
            await this.registerFile(configFile);
        }

    }
    public async onShutdown() {
        for (let fileUri in this.files) {
            await this.files[fileUri].triggerDelete();
            delete this.files[fileUri];
        }
    }

    public async registerFile(document: TextDocument): Promise<void> {
        if (ClientConnection.getInstance().isDebug()) {
            console.log("registering " + document.uri);
        }
        if (!this.files[document.uri]) {
            await this.triggerOnNewFile(document);
        }
        else {
            this.files[document.uri].triggerContentChange(document);
        }
    }
    public async onContentChange(document: TextDocument) {
        if (!this.files[document.uri]) {
            this.triggerOnNewFile(document);
        }
        else {
            this.files[document.uri].triggerContentChange(document);
        }
    }
    public async onSave(document: TextDocument) {
        if (!this.files[document.uri]) {
            this.triggerOnNewFile(document);
        }
        else {
            this.files[document.uri].triggerSave(document);
        }
    }
    public async onClose(document: TextDocument) {
        if (!existsSync(uriToPath(document.uri))) {
            if (this.files[document.uri]) {
                ClientConnection.getInstance().sendDiagnostics({ uri: document.uri, diagnostics: [] })
                await this.files[document.uri].triggerDelete();
                delete this.files[document.uri];
            }
        }
    }

    public async onCompletion(document: TextDocument, position: Position): Promise<CompletionList> {
        if (!this.files[document.uri]) {
            return { isIncomplete: false, items: [] }
        }
        return this.files[document.uri].getCompletion(position);
    }
    public async onCompletionResolve(document: TextDocument, item: CompletionItem): Promise<CompletionItem> {
        if (!this.files[document.uri]) {
            return item;
        }
        return this.files[document.uri].getCompletionResolve(item);
    }

    public async onHover(document: TextDocument, position: Position): Promise<Hover | null> {
        if (!this.files[document.uri]) {
            return null;
        }
        return this.files[document.uri].getHover(position);
    }

    public async onDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
        if (!this.files[document.uri]) {
            return null;
        }
        return this.files[document.uri].getDefinition(position);
    }
    public async onFormatting(document: TextDocument, options: FormattingOptions): Promise<TextEdit[]> {
        if (!this.files[document.uri]) {
            return [];
        }
        return this.files[document.uri].getFormatting(options);
    }
    public async onCodeAction(document: TextDocument, range: Range): Promise<CodeAction[]> {
        if (!this.files[document.uri]) {
            return [];
        }
        return this.files[document.uri].getCodeAction(range);
    }
    public async onReferences(document: TextDocument, position: Position): Promise<Location[] | undefined> {
        if (!this.files[document.uri]) {
            return [];
        }
        return this.files[document.uri].getReferences(position);
    }
    public async onCodeLens(document: TextDocument): Promise<CodeLens[]> {
        if (!this.files[document.uri]) {
            return [];
        }
        return this.files[document.uri].getCodeLens();
    }
    public getBuild(document: TextDocument): Build[] {
        if (!this.files[document.uri]) {
            return [];
        }
        return this.files[document.uri].getBuild();
    }


    //#region event new file
    private onNewFileCb: { [uuid: string]: (document: AventusFile) => Promise<void> } = {};
    public async triggerOnNewFile(document: TextDocument): Promise<void> {
        if (ClientConnection.getInstance().isDebug()) {
            console.log("triggerOnNewFile " + document.uri);
        }
        this.files[document.uri] = new InternalAventusFile(document);
        let proms: Promise<void>[] = [];
        for (let uuid in this.onNewFileCb) {
            proms.push(this.onNewFileCb[uuid](this.files[document.uri]));
        }
        await Promise.all(proms);
    }
    public onNewFile(cb: (document: AventusFile) => Promise<void>): string {
        let uuid = randomUUID();
        while (this.onNewFileCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onNewFileCb[uuid] = cb;
        return uuid;
    }
    public removeOnNewFile(uuid: string) {
        delete this.onNewFileCb[uuid];
    }
    //#endregion

    public getFilesMatching(regex: RegExp): AventusFile[] {
        let result: AventusFile[] = [];
        for (let uri in this.files) {
            if (this.files[uri].path.match(regex)) {
                result.push(this.files[uri]);
            }
        }
        return result;
    }
    public getByPath(path: string): AventusFile | undefined {
        return this.files[pathToUri(path)];
    }
    public getByUri(uri: string): AventusFile | undefined {
        return this.files[uri];
    }

}