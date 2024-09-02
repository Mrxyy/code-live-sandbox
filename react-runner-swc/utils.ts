import React, { createElement, isValidElement, ReactElement } from 'react';
import { transform, normalizeCode, getCodeAst } from './transform';
import { withMultiFiles } from './withMultiFile';
import { createTailwindcss, RunnerOptions, Scope } from './types';
import init from '@swc/wasm-web';
import { setCustomTransform } from './transform';

let drive: ReturnType<typeof init> | Promise<Parameters<typeof setCustomTransform>[0]>;

export function setDrive(swc?: Parameters<typeof init | typeof setCustomTransform> | string) {
    if (!drive) {
        if (typeof swc === 'function') {
            setCustomTransform(swc);
            drive = Promise.resolve(swc);
        } else {
            drive = init(swc);
        }
    }
    return drive;
}

export function isPackage(path) {
    // 判断是否为相对路径
    if (path.startsWith('./') || path.startsWith('../')) {
        return false;
    }

    // 判断是否为绝对路径
    if (path.startsWith('/')) {
        return false;
    }

    // 判断是否包含扩展名
    const extensionPattern = /\.[^\/]+$/;
    if (extensionPattern.test(path)) {
        return false;
    }

    // 其他情况都认为是 npm 包
    return true;
}

const CDN_URL = 'https://esm.sh';
export let loadESModule = function (packageName: string, suffix: string = '') {
    return new Promise((resolve, reject) => {
        try {
            const script = document.createElement('script');
            script.type = 'module';
            const initFnName: any = packageName + 'Init';
            globalThis[initFnName] = (mod: any) => {
                resolve(mod);
                script.remove();
                delete globalThis[initFnName];
            };
            script.textContent = `
                import * as module from "${
                    packageName.includes(CDN_URL) ? '' : CDN_URL + '/'
                }${packageName}${suffix}";
                globalThis["${initFnName}"] && globalThis["${initFnName}"](module)
            `;
            document.head.append(script);
        } catch (e) {
            console.log(e);
        }
    }).catch(e => {
        console.log(e, 'loadESModule-error');
    });
};
export function setLoadESModule(fn: typeof loadESModule) {
    loadESModule = fn;
}

let build;
export async function fetchPackagesFromFiles(options: {
    files: Record<string, string>;
    parseDepsSuccess?: (deps: string[]) => void;
    dependencies?: Record<string, string>;
    isDev?: boolean;
    isBundle?: boolean;
}) {
    const {
        files,
        parseDepsSuccess,
        dependencies = {
            react: 'latest',
            'react-dom': 'latest',
        },
        isDev = true,
        isBundle = true,
    } = options;

    if (!build) {
        const mod: any = await loadESModule('build');
        build = mod.default;
    }
    if (!drive) {
        await setDrive();
    }

    // 分析获取代码依赖
    const maps = getPackageNameFormFiles(files, Object.keys(dependencies));

    const mapsArr = Array.from(maps);
    parseDepsSuccess && parseDepsSuccess(mapsArr);

    const mods = await build({
        peerDependencies: dependencies,
        dependencies,
        source: mapsArr
            .map((packageName, index) => {
                return `export * as mod${index} from "${packageName}";`;
            })
            .join('\n'),
    });

    let depsString = Object.entries(dependencies)
        .map(([name, version]) => `${name}@${version}${isDev ? '&dev' : ''}`)
        .join(',');
    // 如果是开发依赖，前面加上 &dev
    if (isDev) {
        depsString = `&dev&deps=${depsString}`;
    } else {
        depsString = `&deps=${depsString}`;
    }

    const exportPackages = await loadESModule(
        `~${mods.id}`,
        isBundle ? `?bundle&${depsString}` : `?${depsString}`
    );

    return mapsArr.reduce((current, name, index) => {
        current[name] = exportPackages['mod' + index];
        return current;
    }, {});
}

let TailwindCssBuild: createTailwindcss;
let micromatch;
export async function getTailwindCssFormFile(
    tailwindConfig,
    files: Record<string, string>,
    loader = loadESModule
) {
    if (!drive) {
        await setDrive();
    }
    if (!TailwindCssBuild) {
        const mod: any = await loader('@mhsdesign/jit-browser-tailwindcss');
        TailwindCssBuild = mod.createTailwindcss;
    }
    if (!micromatch) {
        micromatch = await loader('micromatch');
    }

    if (!TailwindCssBuild || !micromatch) {
        return;
    }
    const { generateStylesFromContent, setTailwindConfig } = TailwindCssBuild({
        tailwindConfig,
    });

    const content = Object.keys(files)
        .filter(path => {
            return micromatch.isMatch(path, tailwindConfig.content, {
                format: str => str.replace(/^\.\//, ''),
            });
        })
        .map(path => files[path]);

    if (content) {
        const cssContent = await generateStylesFromContent(
            `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    `,
            content
        );
        let style = document.getElementById('tailwind-code-live-sandbox');

        if (!style) {
            style = document.createElement('style');
            style.id = 'tailwind-code-live-sandbox';
        }
        document.head.insertBefore(style, document.head.firstChild);

        style.textContent = cssContent;
    }
    return { generateStylesFromContent, setTailwindConfig };
}

export let getPackageNameFormFiles = function (
    files: Record<string, string>,
    defaultDeps: string[] = []
) {
    // 分析获取代码依赖
    const maps = new Set(defaultDeps);
    for (const file in files) {
        const ast = getCodeAst(files[file]);
        traverseNode(ast, {
            enter(node) {
                if (['ImportDeclaration'].includes(node.type)) {
                    isPackage(node.source.value) && maps.add(node.source.value);
                }
                if (node.type === 'CallExpression' && node.callee.type === 'Import') {
                    const argumentNode = node.arguments[0].expression;
                    if (argumentNode.type === 'StringLiteral') {
                        isPackage(argumentNode.value) && maps.add(argumentNode.value);
                    }
                }
            },
        });
    }
    return maps;
};

export function settPackageNameFormFilesFn(fn: typeof getPackageNameFormFiles) {
    getPackageNameFormFiles = fn;
}

// only swc parse
export function traverseNode(node, visitor) {
    // 调用 visitor 的 enter 方法
    if (visitor.enter) {
        visitor.enter(node);
    }

    // 遍历子节点
    for (let key in node) {
        if (node.hasOwnProperty(key)) {
            let child = node[key];
            if (Array.isArray(child)) {
                child.forEach(n => traverseNode(n, visitor));
            } else if (child && typeof child.type === 'string') {
                traverseNode(child, visitor);
            }
        }
    }
}

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
        console.log(code, e, ':', 'Code has been executed fail.');
    }
};

export const generateElement = ({
    options,
    el,
}: {
    options: RunnerOptions;
    el?: any;
}): { el: ReactElement; changeData: any } | null | ReactElement => {
    const { code, props } = options;
    let { scope } = options;
    const createEl = scope?.import?.react?.createElement || createElement;
    const isValidElementFn = scope?.import?.react?.isValidElement || isValidElement;

    if (el?.type) {
        return createEl(el?.type, props);
    }

    if (!code.trim()) return null;

    const exports: Scope = {};
    if (scope.files) scope.import = withMultiFiles(scope, code)?.import;
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
    if (isValidElementFn(result)) return result;
    if (typeof result === 'function') {
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

export const importCode = (code: string, scope?: Scope, pure?: boolean) => {
    const exports: Scope = {};
    const changeData = evalCode(transform(code), { ...scope, exports });
    if (!pure) {
        exports.changeData = changeData;
    }
    return exports;
};
