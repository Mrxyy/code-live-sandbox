# code-live-sandbox

### 在浏览器中的react代码沙箱。可用应用在组件库文档、代码执行器、react playground等。

#### **对比其他同类产品**

+ 保持和react机制一样，保证生命周期、hooks能够按预期运行。

+ 强扩展性能力,支持自定义transform。

+ 支持内联和挂载模式。

+ 最简洁的代码。

+ 支持复杂的模块化导入系统。

#### 使用

```shell
pnpm add @swc/wasm-web code-live-sandbox
```

```jsx
import * as react  from  "react";
import { LivePreview, LiveProvider, useLiveContext } from'code-live-sandbox';
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
                  import:{ //import 中定义可以使用第三方包依赖
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

#### 使用SWC 作为默认转换器,支持自定义打包器。

```jsx
import {  setDrive } from 'code-live-sandbox';
import { transform as _transform } from 'sucrase';

setDrive((code: string) => {
  return _transform(code, {
    transforms: ['jsx', 'typescript', 'imports'],
    production: true,
  }).code.substring(13); // remove leading `"use strict";`
});
```

#### 默认配置可以通过ts类型查看，支持自定义配置。

```jsx
import { changeTransform } from 'code-live-sandbox';
import { merge } from 'lodash';
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

#### 多文件
```jsx
import { LivePreview, LiveProvider } from'code-live-sandbox';
import useEditor form  '../useEditor'

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
        .button{
            background-color: red;
        }
    `,
    './components/Button.tsx': `import React from 'react';
            import '../Login.module.css';
            const Button = () => {
                return (
                    <button className="button">
                        按钮
                    </button>
                );
            }
            export default Button;`,
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


const Live = (files,import) => {
      return (
            <LiveProvider
                code={value}
                alone={alone}
                scope={{
                    import,
                    files //files中定义文件，文件路径为项目相对路径，例如：./a.tsx,a.css
                }}
                props={props}
            >
              <LivePreview />
            </LiveProvider>
      );
  };

const LiveWithEditor = (scope,setScope) => {

    //files中存在所有文件相对于项目的相对路径和内容,import中是所有可用模块
    const { files, import: dependencies } = useMemo(()=>withMultiFiles(scope),[scope]);

    //根据自己的需求编辑文件内容
    const editor = useEditor(files,setScope);

    return (
       <LiveProvider
                code={value}
                alone={alone}
                scope={{
                    //不再需要files
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

### 计划

+ 自动导入npm依赖的代码沙箱。