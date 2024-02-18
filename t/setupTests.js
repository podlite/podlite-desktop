Object.defineProperty(window, 'require', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    BrowserWindow: 'MOCKED@',
  })),
})
