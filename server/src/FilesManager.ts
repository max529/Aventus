import { FSWatcher, watch } from 'chokidar';
import { v4 as randomUUID } from 'uuid';
import { existsSync, lstatSync, readdirSync, readFileSync } from "fs";
import { CodeAction, CompletionItem, CompletionList, Definition, Diagnostic, FormattingOptions, Hover, Position, Range, TextEdit } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ClientConnection } from './Connection';
import { AventusExtension, AventusLanguageId } from "./definition";
import { getFolder, pathToUri, uriToPath } from "./tools";


export interface AventusFile {
    document: TextDocument;
    uri: string;
    path: string;
    version: number;
    content: string;
    folderUri: string;
    folderPath: string;

    onContentChange(cb: onContentChangeType): string;
    removeOnContentChange(uuid: string): void;

    onSave(cb: (file: AventusFile) => Promise<void>): string;
    removeOnSave(uuid: string): void;

    onDelete(cb: (file: AventusFile) => Promise<void>): string;
    removeOnDelete(uuid: string): void;

    onCompletion(cb: onCompletionType): string;
    removeOnCompletion(uuid: string): void;

    onCompletionResolve(cb: onCompletionResolveType): string;
    removeOnCompletionResolve(uuid: string): void;

    onHover(cb: onHoverType): string;
    removeOnHover(uuid: string): void;

    onDefinition(cb: onDefinitionType): string;
    removeOnDefinition(uuid: string): void;

    onFormatting(cb: onFormattingType): string;
    removeOnFormatting(uuid: string): void;

    onCodeAction(cb: onCodeActionType): string;
    removeOnCodeAction(uuid: string): void;
}

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

export class FilesWatcher {
    private static instance: FilesWatcher | undefined;
    public static getInstance(): FilesWatcher {
        if (!this.instance) {
            this.instance = new FilesWatcher();
        }
        return this.instance;
    }
    private watcher: FSWatcher;
    private constructor() {
        this.watcher = watch('\t', {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true
        });
        this.watcher
            .on('add', this.onContentChange.bind(this))
            .on('change', this.onContentChange.bind(this))
            .on('unlink', this.onRemove.bind(this));
    }

    private files: { [uri: string]: InternalAventusFile } = {};

    public registerFile(uri: string, languageId: string): AventusFile {
        if (!this.files[uri]) {
            let pathToImport = uriToPath(uri);
            let txtToImport = "";
            if (existsSync(pathToImport)) {
                txtToImport = readFileSync(pathToImport, 'utf8')
            }
            let document = TextDocument.create(uri, languageId, 0, txtToImport);
            this.files[document.uri] = new InternalAventusFile(document);
            this.watcher.add(pathToImport);
            for (let uuid in this.onNewFileCb) {
                this.onNewFileCb[uuid](this.files[document.uri]);
            }
        }

        return this.files[uri];
    }
    public onContentChange(path: string) {
        let uri = pathToUri(path);
        if (this.files[uri]) {
            let txtToImport = "";
            if (existsSync(path)) {
                txtToImport = readFileSync(path, 'utf8')
            }
            let document = TextDocument.create(
                uri,
                this.files[uri].document.languageId,
                this.files[uri].document.version + 1,
                txtToImport
            );
            this.files[uri].document = document;
            this.files[uri].triggerContentChange(document);
        }
    }
    public async onRemove(path: string) {
        let uri = pathToUri(path);
        if (this.files[uri]) {
            await this.files[uri].triggerDelete();
            delete this.files[uri];
        }
    }
    public async destroy() {
        await this.watcher.close();
        FilesWatcher.instance = undefined;
    }
    //#region event new file
    private onNewFileCb: { [uuid: string]: (document: AventusFile) => void } = {};
    public onNewFile(cb: (document: AventusFile) => void): string {
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

}


type onContentChangeType = (document: AventusFile) => Promise<Diagnostic[]>;
type onCompletionType = (document: AventusFile, position: Position) => Promise<CompletionList>;
type onCompletionResolveType = (document: AventusFile, item: CompletionItem) => Promise<CompletionItem>;
type onHoverType = (document: AventusFile, position: Position) => Promise<Hover | null>;
type onDefinitionType = (document: AventusFile, position: Position) => Promise<Definition | null>;
type onFormattingType = (document: AventusFile, range: Range, options: FormattingOptions) => Promise<TextEdit[]>;
type onCodeActionType = (document: AventusFile, range: Range) => Promise<CodeAction[]>;

export class InternalAventusFile implements AventusFile {
    public document: TextDocument;

    public constructor(document: TextDocument) {
        this.document = document;
    }

    get uri() {
        return this.document.uri;
    }
    get path() {
        return uriToPath(this.document.uri);
    }
    get version() {
        return this.document.version;
    }
    get content() {
        return this.document.getText();
    }
    get folderUri() {
        return getFolder(this.document.uri);
    }
    get folderPath() {
        return getFolder(this.path);
    }

    //#region content change

    private onContentChangeCb: { [uuid: string]: onContentChangeType } = {};
    private delayContentChange: NodeJS.Timer | undefined;
    public async manualTriggerContentChange(document: TextDocument): Promise<Diagnostic[]> {
        this.document = document;
        let diagnostics: Diagnostic[] = [];
        for (let uuid in this.onContentChangeCb) {
            let diagTemp = await this.onContentChangeCb[uuid](this);
            diagnostics = [
                ...diagnostics,
                ...diagTemp
            ]
        }
        return diagnostics;
    }
    public triggerContentChange(document: TextDocument) {
        if (this.delayContentChange) {
            clearTimeout(this.delayContentChange);
        }
        this.delayContentChange = setTimeout(async () => {
            this.document = document;
            let diagnostics: Diagnostic[] = [];
            for (let uuid in this.onContentChangeCb) {
                let diagTemp = await this.onContentChangeCb[uuid](this);
                diagnostics = [
                    ...diagnostics,
                    ...diagTemp
                ]

                ClientConnection.getInstance().sendDiagnostics({ uri: this.uri, diagnostics: diagnostics })
            }
        }, 500)
    }
    public async triggerContentChangeNoDelay(document: TextDocument) {
        this.document = document;
        let diagnostics: Diagnostic[] = [];
        for (let uuid in this.onContentChangeCb) {
            let diagTemp = await this.onContentChangeCb[uuid](this);
            diagnostics = [
                ...diagnostics,
                ...diagTemp
            ]
            ClientConnection.getInstance().sendDiagnostics({ uri: this.uri, diagnostics: diagnostics })
        }
    }

    public onContentChange(cb: onContentChangeType): string {
        let uuid = randomUUID();
        while (this.onContentChangeCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onContentChangeCb[uuid] = cb;
        return uuid;
    }

    public removeOnContentChange(uuid: string): void {
        delete this.onContentChangeCb[uuid];
    }

    //#endregion

    //#region save

    private onSaveCb: { [uuid: string]: (document: AventusFile) => Promise<void> } = {};

    public async triggerSave(document: TextDocument): Promise<void> {
        this.document = document;
        for (let uuid in this.onSaveCb) {
            this.onSaveCb[uuid](this);
        }
    }

    public onSave(cb: (file: AventusFile) => Promise<void>): string {
        let uuid = randomUUID();
        while (this.onSaveCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onSaveCb[uuid] = cb;
        return uuid;
    }

    public removeOnSave(uuid: string): void {
        delete this.onSaveCb[uuid];
    }
    //#endregion

    //#region delete

    private onDeleteCb: { [uuid: string]: (document: AventusFile) => Promise<void> } = {};

    public async triggerDelete(): Promise<void> {
        let proms: Promise<void>[] = [];
        for (let uuid in this.onDeleteCb) {
            proms.push(this.onDeleteCb[uuid](this));
        }
        await Promise.all(proms);
        // delete all cb
        this.removeAllCallbacks();
    }
    private removeAllCallbacks() {
        this.onCodeActionCb = {};
        this.onCompletionCb = {};
        this.onCompletionResolveCb = {};
        this.onContentChangeCb = {};
        this.onDefinitionCb = {};
        this.onDeleteCb = {};
        this.onFormattingCb = {};
        this.onHoverCb = {};
        this.onSaveCb = {};
    }

    public onDelete(cb: (file: AventusFile) => Promise<void>): string {
        let uuid = randomUUID();
        while (this.onDeleteCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onDeleteCb[uuid] = cb;
        return uuid;
    }

    public removeOnDelete(uuid: string): void {
        delete this.onDeleteCb[uuid];
    }
    //#endregion


    //#region onCompletion
    private onCompletionCb: { [uuid: string]: onCompletionType } = {};

    public async getCompletion(position: Position): Promise<CompletionList> {
        let result: CompletionList = { isIncomplete: false, items: [] }
        let proms: Promise<CompletionList>[] = [];
        for (let uuid in this.onCompletionCb) {
            proms.push(this.onCompletionCb[uuid](this, position));
        }
        let promsResult = await Promise.all(proms);
        for (let promResult of promsResult) {
            result.items = [...result.items, ...promResult.items];
        }
        return result;
    }

    public onCompletion(cb: onCompletionType): string {
        let uuid = randomUUID();
        while (this.onCompletionCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onCompletionCb[uuid] = cb;
        return uuid;
    }

    public removeOnCompletion(uuid: string): void {
        delete this.onCompletionCb[uuid];
    }
    //#endregion

    //#region onCompletionResolve

    private onCompletionResolveCb: { [uuid: string]: onCompletionResolveType } = {};

    public async getCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
        let result = item;
        let proms: Promise<CompletionItem>[] = [];
        for (let uuid in this.onCompletionResolveCb) {
            proms.push(this.onCompletionResolveCb[uuid](this, item));
        }
        let promsResult = await Promise.all(proms);

        for (let promResult of promsResult) {
            if (promResult.additionalTextEdits) {
                if (!result.additionalTextEdits) {
                    result.additionalTextEdits = [];
                }
                result.additionalTextEdits = [...result.additionalTextEdits, ...promResult.additionalTextEdits];
            }
        }
        return result;
    }

    public onCompletionResolve(cb: onCompletionResolveType): string {
        let uuid = randomUUID();
        while (this.onCompletionResolveCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onCompletionResolveCb[uuid] = cb;
        return uuid;
    }

    public removeOnCompletionResolve(uuid: string): void {
        delete this.onCompletionResolveCb[uuid];
    }
    //#endregion

    //#region onHover
    private onHoverCb: { [uuid: string]: onHoverType } = {};

    public async getHover(position: Position): Promise<Hover | null> {
        let proms: Promise<Hover | null>[] = [];
        for (let uuid in this.onHoverCb) {
            proms.push(this.onHoverCb[uuid](this, position));
        }
        let promsResult = await Promise.all(proms);
        for (let promResult of promsResult) {
            if (promResult) {
                return promResult;
            }
        }
        return null;
    }

    public onHover(cb: onHoverType): string {
        let uuid = randomUUID();
        while (this.onHoverCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onHoverCb[uuid] = cb;
        return uuid;
    }

    public removeOnHover(uuid: string): void {
        delete this.onHoverCb[uuid];
    }
    //#endregion

    //#region onDefinition
    private onDefinitionCb: { [uuid: string]: onDefinitionType } = {};

    public async getDefinition(position: Position): Promise<Definition | null> {
        let proms: Promise<Definition | null>[] = [];
        for (let uuid in this.onDefinitionCb) {
            proms.push(this.onDefinitionCb[uuid](this, position));
        }
        let promsResult = await Promise.all(proms);
        for (let promResult of promsResult) {
            if (promResult) {
                return promResult;
            }
        }
        return null;
    }

    public onDefinition(cb: onDefinitionType): string {
        let uuid = randomUUID();
        while (this.onDefinitionCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onDefinitionCb[uuid] = cb;
        return uuid;
    }

    public removeOnDefinition(uuid: string): void {
        delete this.onDefinitionCb[uuid];
    }
    //#endregion

    //#region onFormatting
    private onFormattingCb: { [uuid: string]: onFormattingType } = {};

    public async getFormatting(options: FormattingOptions): Promise<TextEdit[]> {
        let result: TextEdit[] = [];
        let proms: Promise<TextEdit[]>[] = [];
        let range = {
            start: this.document.positionAt(0),
            end: this.document.positionAt(this.document.getText().length)
        };
        for (let uuid in this.onFormattingCb) {
            proms.push(this.onFormattingCb[uuid](this, range, options));
        }
        let promsResult = await Promise.all(proms);
        for (let promResult of promsResult) {
            result = [...result, ...promResult];
        }
        return result;
    }

    public onFormatting(cb: onFormattingType): string {
        let uuid = randomUUID();
        while (this.onFormattingCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onFormattingCb[uuid] = cb;
        return uuid;
    }

    public removeOnFormatting(uuid: string): void {
        delete this.onFormattingCb[uuid];
    }
    //#endregion

    //#region onCodeAction
    private onCodeActionCb: { [uuid: string]: onCodeActionType } = {};

    public async getCodeAction(range: Range): Promise<CodeAction[]> {
        let result: CodeAction[] = [];
        let proms: Promise<CodeAction[]>[] = [];
        for (let uuid in this.onCodeActionCb) {
            proms.push(this.onCodeActionCb[uuid](this, range));
        }
        let promsResult = await Promise.all(proms);
        for (let promResult of promsResult) {
            result = [...result, ...promResult];
        }
        return result;
    }

    public onCodeAction(cb: onCodeActionType): string {
        let uuid = randomUUID();
        while (this.onCodeActionCb[uuid] != undefined) {
            uuid = randomUUID();
        }
        this.onCodeActionCb[uuid] = cb;
        return uuid;
    }

    public removeOnCodeAction(uuid: string): void {
        delete this.onCodeActionCb[uuid];
    }
    //#endregion

}
