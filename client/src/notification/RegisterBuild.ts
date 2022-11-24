import { Singleton } from "../Singleton";

export class RegisterBuild {
    public static cmd: string = "aventus/registerBuild";

    public static action(builds: [string, string]) {
        let uriConfig = builds[0];
        let buildName = builds[1];
        if (!Singleton.allBuilds[uriConfig]) {
            Singleton.allBuilds[uriConfig] = [];
        }
        if (Singleton.allBuilds[uriConfig].indexOf(buildName) == -1) {
            Singleton.allBuilds[uriConfig].push(buildName);
        }
    }
}