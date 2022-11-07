import { Singleton } from "../Singleton";

export class UnregisterBuild {
    public static cmd: string = "aventus/unregisterBuild";

    public static action(uri: string) {
        delete Singleton.allBuilds[uri];
    }
}