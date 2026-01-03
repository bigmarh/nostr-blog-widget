const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

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
    ],
    optimization: {
      minimize: isProduction,
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
  };
};
