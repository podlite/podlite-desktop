const webpack = require('webpack')

const path = require('path')
const PnpWebpackPlugin = require('pnp-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ContextReplacementPlugin = webpack.ContextReplacementPlugin

const commonConfig = {
  mode: 'development',
  devtool: 'source-map',
  plugins: [new NodePolyfillPlugin()],
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build'),
  },
  node: {
    __dirname: false,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.(js|jsx|ts|tsx)$/,
        loader: require.resolve('ts-loader'),
        options: PnpWebpackPlugin.tsLoaderOptions({
          configFile: path.join(__dirname, 'tsconfig.json'),
          // Disable the type-checking, as it will be checked by another module
          transpileOnly: true,
        }),
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.css'],
    plugins: [PnpWebpackPlugin],
    alias: {
      react: path.resolve('./node_modules/react'),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      title: 'pkg.productName',
      template: 'app/renderer/index.html', // from /public : path.resolve(paths.publicPath, 'index.html'),
    }),
    new ContextReplacementPlugin(/any-promise/),
    new webpack.ContextReplacementPlugin(/about-window/),
  ],

  resolveLoader: {
    plugins: [PnpWebpackPlugin.moduleLoader(module)],
  },
}
const devServer = {
  client: {
    overlay: {
      errors: true,
      warnings: true,
    },
    progress: true,
  },
  static: {
    directory: path.join(__dirname, 'build'),
    publicPath: '/',
  },
  // port: 8080,
  compress: true,
  historyApiFallback: true,
  allowedHosts: 'localhost',
  open: false,
}
module.exports = [
  Object.assign(
    {
      target: 'electron-main',
      entry: { main: './app/main/main.ts' },
    },
    commonConfig,
  ),
  Object.assign(
    {
      target: 'electron-renderer',
      entry: { preload: './app/renderer/index.tsx' },
    },
    commonConfig,
    { devServer },
  ),
]
