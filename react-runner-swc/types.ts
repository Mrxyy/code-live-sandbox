export type Scope = Record<string, any> & {
    /** scope used by import statement */
    import?: Record<string, any>;
};

export type RunnerOptions = {
    /** the code to run */
    code: string;
    production?: boolean;
    /** globals that could be used in code */
    scope?: Scope;
    props?: Record<string, any>;
    files?: Record<string, string>;
};
