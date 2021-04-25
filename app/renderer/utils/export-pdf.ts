const  electron  = window.require('electron');
const BrowserWindow = electron.BrowserWindow || electron.remote.BrowserWindow;

export async function htmlToPdfBuffer(htmlData: string, options: any): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const {
			pdfOptions,
		} = options;

		const htmlEncoded = encodeURIComponent(htmlData);

		// Open new BrowserWindow and print it when it has finished loading
		let pdfWindow = new BrowserWindow({
			show: false,
			webPreferences: {
				nodeIntegration: false,
				webSecurity: false, // Required for loading local resources (e.g. images)
			},
		});
		pdfWindow.on("closed", () => {
			// Allow `pdfWindow` to be garbage collected
			// @ts-ignore
			pdfWindow = null;
		});
		pdfWindow.webContents.on("did-finish-load", async () => {
			let buffer;
			try {
				buffer = await pdfWindow.webContents.printToPDF(pdfOptions);
				resolve(buffer);
			} catch (err) {
				reject(err);
			} finally {
				pdfWindow.close();
			}
		});
		pdfWindow.loadURL(`data:text/html;charset=UTF-8,${htmlEncoded}`);
	});
}
