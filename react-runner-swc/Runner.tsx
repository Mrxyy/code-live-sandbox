import { Component, ReactElement, createRef } from 'react';
import init from '@swc/wasm-web/wasm-web';
import { generateElement, shallowEqual } from './utils';
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
        props: RunnerProps,
        state: RunnerState
    ): Partial<RunnerState> | null {
        // only regenerate on code/scope change
        if (!state.readied) {
            return null;
        }

        if (
            state.prevCode === props.code &&
            shallowEqual(state.prevScope, props.scope) &&
            shallowEqual(props.props, state.props)
        ) {
            return null;
        }

        try {
            let el, changeData;
            if (
                state.element &&
                state.prevCode === props.code &&
                shallowEqual(
                    {
                        ...state.prevScope,
                        data: undefined,
                    },
                    {
                        ...props.scope,
                        data: undefined,
                    }
                )
            ) {
                if (typeof props.scope.data === 'object') {
                    for (const key in props.scope.data) {
                        state.changeData(key, props.scope.data[key]);
                    }
                }
                el = generateElement({
                    options: props,
                    el: state.element,
                });
                return {
                    element: el,
                    error: null,
                    prevCode: props.code,
                    prevScope: props.scope,
                    props: props.props,
                };
            } else {
                const res: any = generateElement({
                    options: props,
                });
                el = res?.el;
                changeData = res?.changeData;
            }
            return {
                element: el,
                error: null,
                prevCode: props.code,
                prevScope: props.scope,
                changeData: changeData,
                props: props.props,
            };
        } catch (error: unknown) {
            console.log(error, 'error');
            return {
                element: null,
                error: error as Error,
                prevCode: props.code,
                prevScope: props.scope,
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

    componentDidUpdate() {
        const { createRoot } = this?.state?.prevScope?.import?.['react-dom'] || {};
        const root = createRoot(this.wrapper.current);
        root.render(this.state.error ? null : this.state.element);
        this.props.onRendered?.(this.state.error || undefined);
    }

    render() {
        return <div ref={this.wrapper} id="codeLiveRunner" />;
    }
}
