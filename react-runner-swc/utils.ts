import React, { createElement, isValidElement, ReactElement } from 'react';

import { transform, normalizeCode } from './transform';
import { RunnerOptions, Scope } from './types';

export function shallowEqual(objA, objB) {
    if (objA === objB) {
        return true;
    }

    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
        return false;
    }

    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
        return false;
    }

    for (let i = 0; i < keysA.length; i++) {
        if (
            !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
            objA[keysA[i]] !== objB[keysA[i]]
        ) {
            return false;
        }
    }

    return true;
}

const evalCode = (code: string, scope: Scope) => {
    // `default` is not allowed in `new Function`
    const { data, default: _, import: imports, ...rest } = scope;
    const finalScope: Scope = {
        React,
        require: createRequire(imports),
        data: { ...data },
        ...rest,
    };

    function changeData(key, value) {
        if (typeof finalScope.data === 'object') {
            finalScope.data.key = value;
        }
    }

    const scopeKeys = Object.keys(finalScope); // 获取作用域中所有的key
    const scopeValues = scopeKeys.map(key => finalScope[key]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...scopeKeys, code);
    fn(...scopeValues);
    return changeData;
};

export const generateElement = (
    options: RunnerOptions,
    el?: any
): { el: ReactElement; changeData: any } | null | ReactElement => {
    const { code, props, scope } = options;
    if (el?.type) {
        return createElement(el?.type, props);
    }

    if (!code.trim()) return null;

    const exports: Scope = {};
    const render = (value: unknown) => {
        exports.default = value;
    };
    const changeData = evalCode(transform(normalizeCode(code)), {
        render,
        ...scope,
        exports,
    });

    // 导出的函数
    const result = exports.default; //access function component
    if (!result) return null;
    if (isValidElement(result)) return result;
    if (typeof result === 'function') {
        const el = createElement(result, props);
        return {
            el,
            changeData,
        };
    }
    if (typeof result === 'string') {
        return result as unknown as ReactElement;
    }
    return null;
};

export const createRequire =
    (imports: Scope = {}) =>
    (module: string): Scope => {
        if (!imports.hasOwnProperty(module)) {
            throw new Error(`Module not found: '${module}'`);
        }
        return {
            ...imports[module],
        };
    };

export const importCode = (code: string, scope?: Scope) => {
    const exports: Scope = {};
    evalCode(transform(code), { ...scope, exports });

    return exports;
};
