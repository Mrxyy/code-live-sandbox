# react-live-runner-swc

### 在浏览器中的react代码沙箱。可用应用在组件库文档、代码执行器、react playground等。

#### **对比其他同类产品**

+ 保持和react机制一样，保证生命周期、hooks能够按预期运行。

+ 强扩展性能力,支持自定义transform。

+ 支持内联和挂载模式。

+ 最简洁的代码。

#### 使用

```shell
pnpm add @swc/wasm-web react-live-runner-swc
```

```jsx
import { LivePreview, LiveProvider, useLiveContext } from'react-live-runner-swc';
// Editor 组件安装的需求，实现一个可以可以编辑的容器。例如：MirrorCodevscode等
import Editor form  '../Editor'

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

#### 使用SWC 作为默认转换器,支持自定义打包器。

```jsx
import {  setDrive } from 'react-live-runner-swc';
setDrive((code: string) => {
  return _transform(code, {
    transforms: ['jsx', 'typescript', 'imports'],
    production: true,
  }).code.substring(13); // remove leading `"use strict";`
});
```

#### 默认配置可以通过ts类型查看，支持自定义配置。

```jsx
import { changeTransform } from 'react-live-runner-swc';
import { merge } from 'lodash';
import { transform as _transform } from 'sucrase';
// 设置自定义组件的编译规则
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
#### 内联和挂载模式

+ 内联模式：完美融入当前react app。

+ 挂载模式：挂载在一个单独的Dom容器下,在同一个页面上可以运行多个react。

```html
<LiveProvider code={value} alone={true}...
````

### 计划

+ 自动导入npm依赖的代码沙箱。