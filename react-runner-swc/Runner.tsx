import { Component, ReactElement, createRef } from 'react';
import init from '@swc/wasm-web';
import { generateElement, getPackageNameFormFiles, shallowEqual } from './utils';
import { RunnerOptions, Scope } from './types';
import * as React from 'react';
import { setCustomTransform } from './transform';

export type RunnerProps = RunnerOptions & {
    /** callback on code be rendered, returns error message when code is invalid */
    onRendered?: (error?: Error) => void;
};

type RunnerState = {
    element: ReactElement | null;
    error: Error | null;
    prevCode: string | null;
    prevScope: Scope | undefined;
    changeData: any | undefined;
    props: Record<string, any>;
    readied: boolean;
};

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

let CDN_URL = 'https://esm.sh';
export function loadESModule(packageName: string) {
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
                }${packageName}";
                globalThis["${initFnName}"] && globalThis["${initFnName}"](module)
            `;
            document.head.append(script);
        } catch (e) {
            console.log(e);
        }
    }).catch(e => {
        console.log(e, 'loadESModule-error');
    });
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
        isBundle ? mods.bundleUrl + depsString : mods.url + `?${depsString}`
    );

    return mapsArr.reduce((current, name, index) => {
        current[name] = exportPackages['mod' + index];
        return current;
    }, {});
}

export class Runner extends Component<RunnerProps, RunnerState> {
    state: RunnerState = {
        element: null,
        error: null,
        prevCode: null,
        prevScope: undefined,
        changeData: undefined,
        readied: false,
        props: {},
    };

    static getDerivedStateFromProps(
        optionsProps: RunnerProps,
        state: RunnerState
    ): Partial<RunnerState> | null {
        // only regenerate on code/scope change
        if (!state.readied) {
            return null;
        }

        if (
            state.prevCode === optionsProps.code &&
            shallowEqual(state.prevScope, optionsProps.scope) &&
            shallowEqual(optionsProps.props, state.props)
        ) {
            return null;
        }

        try {
            let el, changeData;
            if (
                state.element &&
                state.prevCode === optionsProps.code &&
                shallowEqual(
                    {
                        ...state.prevScope,
                        data: undefined,
                    },
                    {
                        ...optionsProps.scope,
                        data: undefined,
                    }
                )
            ) {
                if (typeof optionsProps.scope.data === 'object') {
                    for (const key in optionsProps.scope.data) {
                        state.changeData(key, optionsProps.scope.data[key]);
                    }
                }
                el = generateElement({
                    options: optionsProps,
                    el: state.element,
                });
                return {
                    element: el,
                    error: null,
                    prevCode: optionsProps.code,
                    prevScope: optionsProps.scope,
                    props: optionsProps.props,
                };
            } else {
                const res: any = generateElement({
                    options: optionsProps,
                });
                el = res?.el;
                changeData = res?.changeData;
            }
            return {
                element: el,
                error: null,
                prevCode: optionsProps.code,
                prevScope: optionsProps.scope,
                changeData: changeData,
                props: optionsProps.props,
            };
        } catch (error: unknown) {
            console.log(error, 'error');
            return {
                element: null,
                error: error as Error,
                prevCode: optionsProps.code,
                prevScope: optionsProps.scope,
            };
        }
    }

    static getDerivedStateFromError(error: Error): Partial<RunnerState> {
        return { error };
    }

    componentDidMount() {
        if (this.state.readied) {
            this.props.onRendered?.(this.state.error || undefined);
        } else {
            setDrive();
            drive.then(() => {
                this.setState({
                    readied: true,
                });
            });
        }
    }

    componentDidUpdate() {
        this.props.onRendered?.(this.state.error || undefined);
    }

    render() {
        return this.state.error ? null : this.state.element;
    }
}

class ErrorBoundary extends React.Component<
    {
        children: React.ReactNode;
        onError: (error: Error) => void;
    },
    { hasError: boolean }
> {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // You can also log the error to an error reporting service
        this.props.onError(error);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return null;
        }

        return this.props.children;
    }
}
export class AloneRunner extends Runner {
    state: RunnerState = {
        element: null,
        error: null,
        prevCode: null,
        prevScope: undefined,
        readied: false,
        changeData: undefined,
        props: undefined,
    };

    wrapper = createRef<HTMLDivElement>();

    root = null;

    componentDidUpdate() {
        const { createRoot } =
            this?.state?.prevScope?.import?.['react-dom/client'] ||
            this?.state?.prevScope?.import?.['react-dom'] ||
            {};
        if (!this.root) {
            this.root = createRoot(this.wrapper.current);
        }
        this.root.render(
            <ErrorBoundary
                onError={error => {
                    return this.setState({
                        error,
                    });
                }}
            >
                {this.state.error ? null : this.state.element}
            </ErrorBoundary>
        );
        this.props.onRendered?.(this.state.error || undefined);
    }

    render() {
        return <div ref={this.wrapper} id="codeLiveRunner" />;
    }
}
