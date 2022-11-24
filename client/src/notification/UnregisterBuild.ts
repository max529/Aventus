import { Singleton } from "../Singleton";

export class UnregisterBuild {
    public static cmd: string = "aventus/unregisterBuild";

    public static action(builds: [string, string]) {
        let uriConfig = builds[0];
        let buildName = builds[1];
        if (Singleton.allBuilds[uriConfig]) {
            let index = Singleton.allBuilds[uriConfig].indexOf(buildName);
            if (index != -1) {
                Singleton.allBuilds[uriConfig].splice(index, 1);
            }
        }
    }
}