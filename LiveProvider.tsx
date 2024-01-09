import React, { ReactNode } from 'react';

import { LiveContext } from './LiveContext';
import { useLiveRunner, UseLiveRunnerProps } from './useLiveRunner';

export type LiveProviderProps = Omit<UseLiveRunnerProps, 'initialCode'> & {
    children?: ReactNode;
    /** initial code for the live runner */
    code?: string;
    /** language for syntax highlighting */
    language?: string;
};

export const LiveProvider = ({
    children,
    code: initialCode = '',
    language = 'jsx',
    ...rest
}: LiveProviderProps) => {
    const { element, error, code, onChange } = useLiveRunner({
        initialCode,
        ...rest,
    });

    return (
        <LiveContext.Provider value={{ element, error, code, onChange, language }}>
            {children}
        </LiveContext.Provider>
    );
};
