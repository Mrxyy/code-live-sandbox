[中文](./readme-zh.md)
# code-live-sandbox

### React Code Sandbox in the Browser

**Ideal for component library documentation, code executors, React playgrounds, and more.**

#### **Advantages Over Similar Products**

- **Consistency with React Mechanisms**: Ensures lifecycle methods and hooks work as expected.
- **Highly Extensible**: Supports custom transformations.
- **Inline and Mounting Modes**: Flexible integration options.
- **Minimalistic Code**: Clean and straightforward implementation.
- **Complex Module Import System**: Handles intricate import scenarios seamlessly.
- **Automatic Dependency Analysis And Install**: Supports automatic analysis of imported packages in files and downloading npm dependencies.

#### Installation

```shell
pnpm add @swc/wasm-web code-live-sandbox
```

#### Basic Usage

```jsx
import * as react from "react";
import { LivePreview, LiveProvider, useLiveContext } from 'code-live-sandbox';
// Editor component is required, implement an editable container like MirrorCode, vscode, etc.
import Editor from '../Editor';

const Live = useMemo(() => {
  let node;
  try {
    node = !showView ? <Editor /> : <LivePreview />;
  } catch (err) {
    node = <Editor />;
  }
  return (
    <LiveProvider
      code={value}
      scope={{
        import: { // Define third-party package dependencies in import
          react
        }
      }}
      props={props}
    >
      <Error />
      {node}
    </LiveProvider>
  );
}, [props, value, showView]);
```

#### Using SWC as the Default Transformer, Supporting Custom Bundlers

```jsx
import { setDrive } from 'code-live-sandbox';
import { transform as _transform } from 'sucrase';

setDrive((code) => {
  return _transform(code, {
    transforms: ['jsx', 'typescript', 'imports'],
    production: true,
  }).code.substring(13); // remove leading `"use strict";`
});
```

#### Default Configuration with TypeScript Support, Customizable Configuration

```jsx
import { changeTransform } from 'code-live-sandbox';
import { merge } from 'lodash';

// Set custom component compilation rules
changeTransform((config) => {
  return merge(
    {
      jsc: {
        transform: {
          react: { development: process.env.NODE_ENV === 'development' },
        },
      },
    },
    config
  );
});
```

#### Inline and Mounting Modes

- **Inline Mode**: Perfectly integrates with the current React app.
- **Mounting Mode**: Mounts in a separate DOM container, allowing multiple React instances on the same page.

```html
<LiveProvider code={value} alone={true}...
```

#### Multi-File Support

```jsx
import { LivePreview, LiveProvider } from 'code-live-sandbox';
import useEditor from '../useEditor';

const files = {
  './login.tsx': `
    import React from 'react';
    import Content from './Content';
    const Login = () => {
      return (
        <Content/>
      );
    }
    export default Login;
  `,
  'Login.module.css': `
    .button {
      background-color: red;
    }
  `,
  './components/Button.tsx': `
    import React from 'react';
    import '../Login.module.css';
    const Button = () => {
      return (
        <button className="button">
          按钮
        </button>
      );
    }
    export default Button;
  `,
  './Content.tsx': `
    import React from 'react';
    import Button from './components/Button';
    const Content = () => {
      return (
        <Button/>
      );
    }
    export default Content;
  `,
};

const Live = (files, import) => {
  return (
    <LiveProvider
      code={value}
      alone={alone}
      scope={{
        import,
        files // Define files with relative paths, e.g., ./a.tsx, a.css
      }}
      props={props}
    >
      <LivePreview />
    </LiveProvider>
  );
};

const LiveWithEditor = (scope, setScope) => {
  // files contain all relative paths and content, import contains all available modules
  const { files, import: dependencies } = useMemo(() => withMultiFiles(scope), [scope]);

  // Edit file content as needed
  const editor = useEditor(files, setScope);

  return (
    <LiveProvider
      code={value}
      alone={alone}
      scope={{
        // No need for files anymore
        import: dependencies
      }}
      props={props}
    >
      <LivePreview />
      {editor}
    </LiveProvider>
  );
};
```


####  Automatically analyze the imported packages in the file and download npm dependencies.

```tsx
function useAsyncMemo<T>(fn: () => Promise<T>, deps: any[]): T | undefined {
    const [value, setValue] = useState<T>();
    useEffect(() => {
        fn().then(v => {
            setValue(v);
        });
    }, deps);
    return value;
}

function Demo({props,files,dependenciesMap={},code}:{
  props:Record<string,any>,
  files:Record<string,string>,
  dependenciesMap:Record<string,any>,
  code:string;
}){
  const resolveDeps = useAsyncMemo(async () => {
        setInitStatus(false);
        const mods = await fetchPackagesFromFiles({
            files: {
                ...files,
                [ENTRY_FILE_PATH]: code,
                Require: `
                import * as React from 'react';
                import  * as ReactDom from 'react-dom';
                export {React,ReactDom}
            `,
            },
            parseDepsSuccess: deps => {
            },
        });

        return {
            ...mods,
            ...dependenciesMap,
        };
    }, [JSON.stringify(files), code, dependenciesMap]);

    return <LiveProvider
                code={code}
                scope={{
                    import: resolveDeps,
                }}
                props={props}
            >
                <Error />
                {node}
            </LiveProvider>
}
```

### Roadmap

- Online playground with demos of all features.
