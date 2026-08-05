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
    // jest 26 does not read this package's exports map and picks its esm source
    '^@marijn/find-cluster-break$': '<rootDir>/node_modules/@marijn/find-cluster-break/dist/index.cjs',
  },
  // every dependency ships commonjs, so none of them goes through the transform;
  // running them through it made the compiler read library code it cannot parse
  transformIgnorePatterns: ['/node_modules/'],

  setupFilesAfterEnv: ['<rootDir>/t/setupTests.js'],

  modulePaths: ['<rootDir>'],
}
