const electron = window.require('electron')
const { ipcRenderer } = electron

export async function htmlToPdfBuffer(htmlData: string, options: any): Promise<Buffer> {
  const { pdfOptions } = options

  try {
    // Use IPC to request PDF generation from main process
    const buffer = await ipcRenderer.invoke('html-to-pdf', {
      htmlData,
      pdfOptions,
    })
    return buffer
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}
