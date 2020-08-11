import { autoUpdater } from "electron-updater"
import { is } from "electron-util"

export default async function update(): Promise<void> {
	// disable updating for stores
	if (!is.macAppStore || !is.windowsStore) {
		try {
			await autoUpdater.checkForUpdatesAndNotify();
		} catch (err) {
			if (err.message !== "net::ERR_INTERNET_DISCONNECTED") {
				throw err;
			}
		}
	}
}
