import { Options, transformSync as _transform, parseSync } from '@swc/wasm-web/wasm-web';

let customTransform: (code: string) => string;

export function setCustomTransform(customTransformFn: typeof customTransform) {
    customTransform = customTransformFn;
}

let config: Options = {
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
        strict: false,
        strictMode: false,
    },
    minify: true,
    isModule: true,
};

export function changeTransform(customTransformFn: (customTransformFn: Options) => Options) {
    config = customTransformFn(config);
}

export const transform = (code: string) => {
    return customTransform ? customTransform(code) : _transform(code, config).code;
};

export const getCodeAst = (code: string) => {
    return parseSync(code, {
        syntax: 'typescript',
        tsx: true,
        target: 'es5',
    });
};

const firstStatementRegexp = /^(\s*)(<[^>]*>|function[(\s]|\(\)[\s=]|class\s)(.*)/;

export const normalizeCode = (code: string) => {
    return code.replace(firstStatementRegexp, '$1export default $2$3');
};
