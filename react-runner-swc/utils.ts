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

function shallowClone(obj) {
    if (Array.isArray(obj)) {
        // 使用 slice() 来浅克隆数组
        return obj.slice();
    } else if (typeof obj === 'object' && obj !== null) {
        // 使用展开运算符来浅克隆对象
        return { ...obj };
    } else {
        // 非对象或数组，直接返回（基本数据类型是不需要克隆的）
        return obj;
    }
}

//code + scope => export.default
export const evalCode = (code: string, scope: Scope) => {
    try {
        // `default` is not allowed in `new Function`
        const { data, default: _, import: imports, ...rest } = scope;
        const finalScope: Scope = {
            React: imports?.React || React,
            require: createRequire(imports),
            data: shallowClone(data),
            ...rest,
        };

        const changeData = (key, value) => {
            if (typeof finalScope.data === 'object') {
                finalScope.data.key = value;
            }
        };

        const scopeKeys = Object.keys(finalScope); // 获取作用域中所有的key
        const scopeValues = scopeKeys.map(key => finalScope[key]);
        // eslint-disable-next-line no-new-func
        const fn = new Function(...scopeKeys, code);
        fn(...scopeValues);
        return changeData;
    } catch (e) {
        console.log(code, ':', 'Code has been executed fail.');
    }
};

export const generateElement = ({
    options,
    el,
}: {
    options: RunnerOptions;
    el?: any;
}): { el: ReactElement; changeData: any } | null | ReactElement => {
    const { code, props, scope } = options;
    if (el?.type) {
        return createElement(el?.type, props);
    }

    if (!code.trim()) return null;

    const exports: Scope = {};
    const render = (value: unknown) => {
        exports.default = value;
    };

    const proCode = options.production ? options.code : transform(normalizeCode(code));
    const changeData = evalCode(proCode, {
        render,
        ...scope,
        exports,
    });
    // 导出的函数
    const result = exports.default; //access function component

    if (!result) return null;
    if (isValidElement(result)) return result;
    if (typeof result === 'function') {
        const createEl = scope?.import?.react?.createElement || createElement;

        return {
            el: createEl(result, props),
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
    exports.changeData = evalCode(transform(code), { ...scope, exports });

    return exports;
};
