import { useState, useRef, useEffect, createElement, ReactElement } from 'react';

import { Runner, AloneRunner } from './Runner';
import { RunnerOptions } from './types';

export type UseRunnerProps = RunnerOptions & {
    /** whether to cache previous element when error occurs with current code */
    disableCache?: boolean;
    alone?: boolean;
};

export type UseRunnerReturn = {
    element: ReactElement | null;
    error: string | null;
};

export const useRunner = ({
    code,
    scope,
    props,
    disableCache,
    alone,
    production,
}: UseRunnerProps): UseRunnerReturn => {
    const elementRef = useRef<ReactElement | null>(null);

    const [state, setState] = useState<UseRunnerReturn>(() => {
        return { element: null, error: null };
    });
    useEffect(() => {
        const element = createElement(alone ? AloneRunner : Runner, {
            code,
            scope,
            props,
            production,
            onRendered: error => {
                if (error) {
                    setState({
                        element: disableCache ? null : elementRef.current,
                        error: error.toString(),
                    });
                } else {
                    elementRef.current = element;
                }
            },
        });
        setState({ element, error: null });
    }, [code, scope, disableCache, alone, props]);

    return state;
};
