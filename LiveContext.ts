import { createContext, useContext } from 'react';

import { UseLiveRunnerReturn } from './useLiveRunner';

export type LiveContextProps = UseLiveRunnerReturn & {
    language?: string;
};

export const LiveContext = createContext<LiveContextProps>({} as LiveContextProps);

export const useLiveContext = () => useContext(LiveContext);
