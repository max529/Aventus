import { ClientConnection } from '../Connection';

export class Compiled {

	public static send(buildName: string) {
		ClientConnection.getInstance().sendNotification("aventus/compiled", buildName);
	}
}