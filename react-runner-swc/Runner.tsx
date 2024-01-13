import { Component, ReactElement, createRef } from 'react'
import init from '@swc/wasm-web/wasm-web'
import { generateElement } from './utils'
import { RunnerOptions, Scope } from './types'
import * as React from 'react';
import * as ReactDOM from 'react-dom';

class ReactAppContainer extends HTMLElement {
  private mountPoint: HTMLDivElement;
  private _React: typeof React | undefined;
  private _ReactDOM: typeof ReactDOM | undefined;
  private _App: ReactElement | undefined;


  root: ShadowRoot;
  constructor() {
    super();
    this.mountPoint = document.createElement('div');
    this.root = this.attachShadow({ mode: 'open' });
    this.root.appendChild(this.mountPoint);

  }

  connectedCallback() {
    if (this._React && this._ReactDOM && this._App) {
      this._ReactDOM.render(this._App, this.mountPoint);

      // 将全局的 <link> 元素复制到 Shadow DOM
      // const links = document.querySelectorAll('link[rel="stylesheet"]');
      // links.forEach((link) => {
      //   const newLink = document.createElement('link');
      //   Array.from(link.attributes).forEach((attr) => {
      //     newLink.setAttribute(attr.name, attr.value);
      //   });
      //   this.root.appendChild(newLink);
      // });
      this.root.adoptedStyleSheets = [...document.adoptedStyleSheets];
      console.log(document.adoptedStyleSheets)
    } else {
      console.error('React, ReactDOM, and App must be provided.');
    }
  }

  disconnectedCallback() {
    if (this._ReactDOM) {
      this._ReactDOM.unmountComponentAtNode(this.mountPoint);
    }
  }

  set React(value: typeof React) {
    this._React = value;
  }

  get React(): typeof React | undefined {
    return this._React;
  }

  set ReactDOM(value: typeof ReactDOM) {
    this._ReactDOM = value;
  }

  get ReactDOM(): typeof ReactDOM | undefined {
    return this._ReactDOM;
  }

  set App(value: ReactElement) {
    this._App = value;
  }

  get App(): ReactElement | undefined {
    return this._App;
  }
}

customElements.define('react-app-container', ReactAppContainer);


export type RunnerProps = RunnerOptions & {
  /** callback on code be rendered, returns error message when code is invalid */
  onRendered?: (error?: Error) => void
}

type RunnerState = {
  element: ReactElement | null
  error: Error | null
  prevCode: string | null
  prevScope: Scope | undefined
  readied: boolean
}
let drive: ReturnType<typeof init>

export function setDrive(swc?: Parameters<typeof init> | string) {
  drive = drive || init(swc)
  return drive
}

export class Runner extends Component<RunnerProps, RunnerState> {
  state: RunnerState = {
    element: null,
    error: null,
    prevCode: null,
    prevScope: undefined,
    readied: false,
  }

  static getDerivedStateFromProps(
    props: RunnerProps,
    state: RunnerState
  ): Partial<RunnerState> | null {
    // only regenerate on code/scope change
    if (!state.readied) {
      return null
    }
    if (state.prevCode === props.code && state.prevScope === props.scope) {
      return null
    }

    try {
      return {
        element: generateElement(props),
        error: null,
        prevCode: props.code,
        prevScope: props.scope,
      }
    } catch (error: unknown) {
      return {
        element: null,
        error: error as Error,
        prevCode: props.code,
        prevScope: props.scope,
      }
    }
  }

  static getDerivedStateFromError(error: Error): Partial<RunnerState> {
    return { error }
  }

  componentDidMount() {
    if (this.state.readied) {
      this.props.onRendered?.(this.state.error || undefined)
    } else {
      setDrive()
      drive.then(() => {
        this.setState({
          readied: true,
        })
      })
    }
  }

  shouldComponentUpdate(nextProps: RunnerProps, nextState: RunnerState) {
    return (
      nextProps.code !== this.props.code ||
      nextProps.scope !== this.props.scope ||
      nextState.error !== this.state.error ||
      nextState.readied !== this.state.readied
    )
  }

  componentDidUpdate() {
    this.props.onRendered?.(this.state.error || undefined)
  }

  render() {
    return this.state.error ? null : this.state.element
  }
}
export class AloneRunner extends Runner {
  state: RunnerState = {
    element: null,
    error: null,
    prevCode: null,
    prevScope: undefined,
    readied: false,
  }

  wrapper = createRef<HTMLDivElement>()

  componentDidUpdate() {
    //
    // this.wrapper.current = document.createElement('div');
    // const container = new ReactAppContainer();
    // container.React =  this.state.prevScope.import["react"];
    // container.ReactDOM =  this.state.prevScope.import["react-dom"];
    // container.App = this.state.element
    // this.wrapper.current.appendChild(container);

    const { createRoot } = this?.state?.prevScope?.import?.["react-dom"] || {}
    const root = createRoot(this.wrapper.current);
    root.render(this.state.error ? null : this.state.element);
    this.props.onRendered?.(this.state.error || undefined)
  }

  render() {
    return <div ref={this.wrapper} id="codeLiveRunner" />
  }
}


