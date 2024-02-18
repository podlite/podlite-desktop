module.exports = {
  moduleDirectories: ['node_modules'],
  snapshotSerializers: ['jest-serializer-html'],
  transform: {
    '\\.(t|j)sx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/jest.tsconfig.json',
    },
  },
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/t/fileMock.js',
    '\\.(s?css|less)$': '<rootDir>/t/styleMock.js',
    electron: '<rootDir>/t/electron.js',
  },
  transformIgnorePatterns: ['node_modules/(?!(podlite' + '|@podlite' + '|entity-decode' + ')/)'],

  setupFilesAfterEnv: ['<rootDir>/t/setupTests.js'],

  modulePaths: ['<rootDir>'],
}
