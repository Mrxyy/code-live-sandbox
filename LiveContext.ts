import { createContext, useContext } from 'react';

import { UseLiveRunnerRetrun } from './useLiveRunner';

export type LiveContextProps = UseLiveRunnerRetrun & {
    language?: string;
};

export const LiveContext = createContext<LiveContextProps>({} as LiveContextProps);

export const useLiveContext = () => useContext(LiveContext);
