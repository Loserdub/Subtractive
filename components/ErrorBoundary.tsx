import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Subtractive Workspace Component Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-4 rounded-sm bg-[#12080a] border border-[#ff3344]/40 flex flex-col items-center justify-center text-center gap-2 m-auto max-w-md my-4">
          <div className="w-3 h-3 rounded-full bg-[#ff3344] shadow-[0_0_8px_#ff3344]" />
          <h3 className="font-mono text-xs font-bold text-[#ff3344] uppercase tracking-wider">
            {this.props.fallbackTitle || 'Workspace Recovery'}
          </h3>
          <p className="font-mono text-[9px] text-gray-400 max-w-xs">
            A parameter parsing error occurred. Click below to recover and re-initialize module state.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-3 py-1 rounded font-mono text-[9px] font-bold bg-[#ff3344] text-white hover:brightness-110 active:scale-95 transition-all shadow-[0_0_8px_rgba(255,51,68,0.4)]"
          >
            RECOVER WORKSPACE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
