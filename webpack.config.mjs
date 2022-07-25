'use strict';

import HtmlWebpackPlugin from 'html-webpack-plugin';
/**
 * @returns {import("webpack").Configuration}
 */
export default function (env, args) {
    return {
        entry: './index.ts',
        output: { clean: true },
        plugins: [new HtmlWebpackPlugin(),],
        resolve: { extensions: ['.ts', '...'] },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: { loader: 'ts-loader' },
                },
            ],
        },
        devServer: { hot: false },
        devtool: 'eval-source-map',
    }
}
