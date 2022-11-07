import { StatusBarAlignment, StatusBarItem, window } from "vscode";

export class AvenutsVsComponent {
    public lastCompiledInfo: StatusBarItem;

    constructor() {
        this.lastCompiledInfo = window.createStatusBarItem("last-compiled-info", StatusBarAlignment.Right, 1000);
        this.lastCompiledInfo.text = "";
        this.lastCompiledInfo.show();
    }

}