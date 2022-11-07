import { window } from "vscode";
import { BuildQuickPick, QuickPick } from "../quickPick";
import { Singleton } from "../Singleton";

export class Create {
    static cmd: string = "aventus.create";

    public static async middleware(args: any[]): Promise<any[]> {
        const result = await window.showQuickPick(QuickPick.createOptions, {
            placeHolder: 'What do you want to create?',
            canPickMany: false,
        });
        if (result) {
            QuickPick.reorder(QuickPick.createOptions, result);
            args.push(result);
            if (result.label == "Init") {
                let folderSplitted = args[0].path.split('/');
                const name = await window.showInputBox({
                    title: "Provide a name for your project",
                    value: folderSplitted[folderSplitted.length - 1]
                });
                args.push(name);
            }
            else if (result.label == "RAM") {
                let dataToLink: BuildQuickPick[] = [];
                for (let uri in Singleton.dataClasses) {
                    for (let name of Singleton.dataClasses[uri]) {
                        dataToLink.push(new BuildQuickPick(name, uri));
                    }
                }
                const resultData = await window.showQuickPick(dataToLink, {
                    placeHolder: 'Data for the RAM',
                    canPickMany: false,
                });
                if (resultData) {
                    args.push(resultData);
                }
            }
            else if (result.label == "Component") {
                const name = await window.showInputBox({
                    title: "Provide a name for your " + result.label,
                });
                args.push(name);
                if (name) {
                    const resultFormat = await window.showQuickPick(QuickPick.componentFormat, {
                        placeHolder: 'How should I setup your component?',
                        canPickMany: false,
                    });
                    if (resultFormat) {
                        QuickPick.reorder(QuickPick.componentFormat, resultFormat);
                        args.push(resultFormat);
                    }
                }
            }
            else {
                const name = await window.showInputBox({
                    title: "Provide a name for your " + result.label,
                });
                args.push(name);
            }
        }
        return args;
    }
}