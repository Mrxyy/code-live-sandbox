import { Options, transformSync as _transform, parseSync } from '@swc/wasm-web/wasm-web';

const config: Options = {
    jsc: {
        parser: {
            syntax: 'typescript',
            tsx: true,
        },
        target: 'es5',
        loose: false,
        minify: {
            compress: false,
            mangle: false,
        },
        keepClassNames: true,
        transform: {
            react: { development: true },
        },
    },
    module: {
        type: 'commonjs',
        noInterop: true,
    },
    minify: false,
    isModule: true,
};

export const transform = (code: string) => {
    // console.log(
    //     parseSync(code, {
    //         syntax: 'typescript',
    //         tsx: true,
    //         target: 'es5',
    //     }),
    //     '22233'
    // );
    return _transform(code, config).code.substring(13); // remove leading `"use strict";`
};

const firstStatementRegexp = /^(\s*)(<[^>]*>|function[(\s]|\(\)[\s=]|class\s)(.*)/;

export const normalizeCode = (code: string) => {
    return code.replace(firstStatementRegexp, '$1export default $2$3');
};
