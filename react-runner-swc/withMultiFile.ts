import { importCode } from './utils';
import { Scope } from './types';

export const splitFileName = (filename: string) => {
    const baseIdx = filename.lastIndexOf('/');
    const idx = filename.lastIndexOf('.');
    if (idx <= baseIdx) return [filename, ''];
    return [filename.substring(0, idx), filename.substring(idx + 1)];
};

export const ENTRY_FILE_PATH = './App.tsx';
const ALIAS_EXTENSION = ['js', 'jsx', 'ts', 'tsx', 'css'];

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

export function resolvePath(basePath, relativePath) {
    // 创建一个新的 URL 对象，基于基准路径解析相对路径
    const absoluteUrl = new URL(relativePath, `https://localhost:3000/${basePath}`);

    // 返回解析后的绝对路径
    return '.' + absoluteUrl.pathname;
}

export const withMultiFiles = (scope: Scope) => {
    const imports: Scope = scope.import;
    const filesMap: Record<string, string> = {};

    for (const key in scope.files) {
        const v = scope.files[key];
        const [name, ext] = splitFileName(key);
        if (ALIAS_EXTENSION.includes(ext) && typeof v === 'string') {
            filesMap[key] = v;
        }
    }

    const files: Record<string, string> = Object.fromEntries(
        Object.entries(filesMap)
            .map(([key, value]) => {
                const [name, ext] = splitFileName(key);
                if (!['js', 'jsx', 'ts', 'tsx', 'css'].includes(ext)) return [];
                return [[resolvePath(ENTRY_FILE_PATH, key), value]];
            })
            .flat()
    );

    const createImportsProxy: (imports: Record<string, any>, path: string) => Scope = (
        imports,
        path
    ) => {
        return new Proxy(imports, {
            getOwnPropertyDescriptor(target, _prop) {
                if (isPackage(_prop)) {
                    if (target.hasOwnProperty(_prop)) {
                        return Object.getOwnPropertyDescriptor(target, _prop);
                    }
                }
                let prop = resolvePath(path, _prop);
                if (!files.hasOwnProperty(prop)) {
                    ALIAS_EXTENSION.some(v => {
                        const fullPath = prop + `.${v}`;
                        if (files.hasOwnProperty(fullPath)) {
                            prop = fullPath;
                            return true;
                        }
                    });
                }
                if (files.hasOwnProperty(prop)) {
                    return { writable: true, enumerable: true, configurable: true };
                }
                return undefined;
            },
            get(target, _prop: string) {
                if (isPackage(_prop)) {
                    return target[_prop];
                }
                let prop = resolvePath(path, _prop);
                if (prop in target) return target[prop];
                if (!files.hasOwnProperty(prop)) {
                    ALIAS_EXTENSION.some(v => {
                        const fullPath = prop + `.${v}`;
                        if (files.hasOwnProperty(fullPath)) {
                            prop = fullPath;
                            return true;
                        }
                    });
                }
                if (files.hasOwnProperty(prop)) {
                    try {
                        let code = files[prop];
                        if (splitFileName(prop)[1] === 'css') {
                            code = `
const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(${JSON.stringify(code)});
if (globalThis.document) {
    document.adoptedStyleSheets = [
        ...document.adoptedStyleSheets,
        styleSheet,
    ];
}`;
                        }
                        return (target[prop] = importCode(
                            code,
                            {
                                ...scope,
                                // entry file can use `render` but `importCode` doesn't provide it
                                render: () => {},
                                import: createImportsProxy(imports, prop),
                            },
                            true
                        ));
                    } catch (error: any) {
                        const name = Object.keys(filesMap).find(
                            x => `./${splitFileName(x)[0]}` === splitFileName(prop)[0]
                        );
                        if (!error.name?.startsWith('.')) error.name = `./${name}`;
                        throw error;
                    }
                }
            },
        });
    };

    return { ...scope, files, import: createImportsProxy(imports, ENTRY_FILE_PATH) };
};
