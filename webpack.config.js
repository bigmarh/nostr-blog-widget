const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');
const package = require('./package.json');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    output: {
      filename: 'nostr-blog.js',
      path: path.resolve(__dirname, 'dist'),
      library: {
        name: 'NostrBlog',
        type: 'umd',
        export: 'default',
      },
      globalObject: 'this',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['solid'],
              },
            },
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
          ],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'nostr-blog.css',
      }),
      new webpack.BannerPlugin({
        banner: `Nostr Blog Widget v${package.version} | https://github.com/bigmarh/nostr-blog-widget`,
      }),
    ],
    optimization: {
      minimize: isProduction,
      minimizer: isProduction ? [
        (compiler) => {
          const TerserPlugin = require('terser-webpack-plugin');
          new TerserPlugin({
            extractComments: false,
            terserOptions: {
              format: {
                comments: /Nostr Blog Widget/,
              },
            },
          }).apply(compiler);
        },
      ] : [],
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
  };
};
