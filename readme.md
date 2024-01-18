[中文](./readme-zh.md)
# react-live-runner-swc

### A React code sandbox in the browser. Useful for component library documentation, code execution, React playgrounds, and more.

#### **Comparison with Similar Products**

+ Maintains consistency with React's mechanisms, ensuring that lifecycle methods and hooks work as expected.

+ Strong extensibility, with support for custom transforms.

+ Supports both inline and mounted modes.

+ The most concise code.

#### Usage

```shell
pnpm add @swc/wasm-web react-live-runner-swc
```

```jsx
import { LivePreview, LiveProvider, useLiveContext } from 'react-live-runner-swc';
// Requirements for the Editor component, implement an editable container. For example: MirrorCode, vscode, etc.
import Editor from '../Editor'

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
                  ...scope,
                  data: props,
              }}
          >
              <Error />
              {node}
          </LiveProvider>
      );
  }, [props, value, showView]);
```

#### Using SWC as the Default Transformer, with Support for Custom Bundlers.

```jsx
import { setDrive } from 'react-live-runner-swc';
setDrive((code: string) => {
  return _transform(code, {
    transforms: ['jsx', 'typescript', 'imports'],
    production: true,
  }).code.substring(13); // remove leading `"use strict";`
});
```

#### Default configurations can be inspected with TypeScript types, and custom configurations are supported.

```jsx
import { changeTransform } from 'react-live-runner-swc';
import { merge } from 'lodash';
import { transform as _transform } from 'sucrase';
// Set custom compilation rules for components
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
#### Inline and Mounted Modes

+ Inline mode: Integrates seamlessly into the current React app.

+ Mounted mode: Mounted under a separate DOM container, allowing multiple React instances to run on the same page.

```html
<LiveProvider code={value} alone={true}...
```

### Roadmap

+ A code sandbox with automatic npm dependency importation.