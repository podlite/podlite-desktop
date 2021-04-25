module.exports = {
    moduleDirectories: [
      'node_modules',
    ],
    "snapshotSerializers": [
        "jest-serializer-html"
     ],
    transform: {
      "\\.(t|j)sx?$": "ts-jest",
    //   "\\.jsx?$": "ts-jest",
    },
    globals: {
      "ts-jest": {
        "tsconfig": '<rootDir>/jest.tsconfig.json'
      }
    },
    "moduleNameMapper": {
        "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/t/fileMock.js",
        "\\.(s?css|less)$": "<rootDir>/t/styleMock.js"
    },
    transformIgnorePatterns: [
        "[/\\\\]node_modules[/\\\\](?!entity-decode/).+\\.js$"
      ],
    "modulePaths": [
        "<rootDir>"     
      ],
  }