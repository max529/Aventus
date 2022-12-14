import { TextDocument } from "vscode-languageserver-textdocument";
import { CodeActionKind, InitializedParams, InitializeParams, TextDocuments, TextDocumentSyncKind } from "vscode-languageserver/node";
import { Commands } from "./cmds";
import { ClientConnection } from './Connection';
import { AventusExtension } from "./definition";
import { FilesManager } from './files/FilesManager';
import { FilesWatcher } from './files/FilesWatcher';
import { ProjectManager } from './project/ProjectManager';

// all documents loaded
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

documents.onDidChangeContent(e => {
    if (isAllowed(e.document)) {
        FilesManager.getInstance().onContentChange(e.document);
    }
});

documents.onDidSave((e) => {
    if (isAllowed(e.document)) {
        FilesManager.getInstance().onSave(e.document);
    }
})
documents.onDidClose(e => {
    if (isAllowed(e.document)) {
        FilesManager.getInstance().onClose(e.document);
    }
});

const workspaces: string[] = [];
ClientConnection.getInstance().connection?.onInitialize((_params: InitializeParams) => {
    if (_params.workspaceFolders) {
        for (let workspaceFolder of _params.workspaceFolders) {
            workspaces.push(workspaceFolder.uri);
        }
    }
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that the server supports code completion
            completionProvider: {
                resolveProvider: true,
                // triggerCharacters: ['.'],
            },
            executeCommandProvider: {
                commands: Object.keys(Commands.allCommandes)
            },
            hoverProvider: {},
            definitionProvider: {},
            documentFormattingProvider: {},
            codeActionProvider: {
                codeActionKinds: [CodeActionKind.QuickFix],
                resolveProvider: true,
            },
            referencesProvider: {
            },
            codeLensProvider: {
                resolveProvider: true,
            },
            renameProvider: true
        }
    };
})
ClientConnection.getInstance().connection?.onInitialized((_params: InitializedParams) => {
    startServer(workspaces);
})
ClientConnection.getInstance().connection?.onShutdown(() => {
    stopServer();
});

ClientConnection.getInstance().connection?.onCompletion(async (textDocumentPosition, token) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onCompletion(document, textDocumentPosition.position);
    }
    return null;

});

ClientConnection.getInstance().connection?.onCompletionResolve(async (completionItem, token) => {
    if (completionItem.data?.uri) {
        const document = documents.get(completionItem.data.uri);
        if (document && isAllowed(document)) {
            return await FilesManager.getInstance().onCompletionResolve(document, completionItem);
        }
    }
    return completionItem;
});

ClientConnection.getInstance().connection?.onHover(async (textDocumentPosition, token) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onHover(document, textDocumentPosition.position);
    }
    return null;
});
ClientConnection.getInstance().connection?.onDefinition(async (textDocumentPosition, token) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onDefinition(document, textDocumentPosition.position);
    }
    return null;

});
ClientConnection.getInstance().connection?.onDocumentFormatting(async (formattingParams, token) => {
    const document = documents.get(formattingParams.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onFormatting(document, formattingParams.options);
    }
    return null;
})
ClientConnection.getInstance().connection?.onCodeAction(async (params, token) => {
    const document = documents.get(params.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onCodeAction(document, params.range);
    }
    return null;
});
ClientConnection.getInstance().connection?.onCodeLens(async (params, token) => {
    const document = documents.get(params.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onCodeLens(document);
    }
    return null;
});
ClientConnection.getInstance().connection?.onReferences(async (params, token, workDoneProgress) => {
    const document = documents.get(params.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onReferences(document, params.position);
    }
    return null;
});
ClientConnection.getInstance().connection?.onRenameRequest(async (params, token, workDoneProgress) => {
    const document = documents.get(params.textDocument.uri);
    if (document && isAllowed(document)) {
        return await FilesManager.getInstance().onRename(document, params.position, params.newName);
    }
    return null;
});

// not on document
ClientConnection.getInstance().connection?.onExecuteCommand(async (params) => {
    Commands.execute(params);
});

let connection = ClientConnection.getInstance().connection;
if (connection) {
    // Make the text document manager listen on the connection
    // for open, change and close text document events
    documents.listen(connection);

    // Listen on the connection
    connection.listen();
}

function isAllowed(document: TextDocument) {
    if (document.uri.endsWith(AventusExtension.Base) || document.uri.endsWith(AventusExtension.Config)) {
        return true;
    }
    return false;
}


export async function startServer(workspaces: string[]) {
    ProjectManager.getInstance();
    await FilesManager.getInstance().loadAllAventusFiles(workspaces);
    if (ClientConnection.getInstance().isDebug()) {
        console.log("start server done");
    }
}
export async function stopServer() {
    await FilesWatcher.getInstance().destroy();
    ProjectManager.getInstance().destroyAll();
    await FilesManager.getInstance().onShutdown();
}