import { Singleton } from "../Singleton";

export class RegisterBuild {
    public static cmd: string = "aventus/registerBuild";

    public static action(builds: [string[], string]) {
        Singleton.allBuilds[builds[1]] = builds[0];
    }
}