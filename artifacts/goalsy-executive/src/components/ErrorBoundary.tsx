import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches any unhandled render errors in the subtree and shows a recovery
 * screen instead of a blank/white page. Especially important in the
 * Capacitor native build where there's no browser DevTools to see what broke.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Uncaught render error:', err, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-[#05070A] flex flex-col items-center justify-center px-8 gap-6 text-center">
          <div className="w-16 h-16 bg-[#1F2937] border border-white/10 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-white font-bold text-xl">Something went wrong</h2>
            <p className="text-[#808BA4] text-sm leading-relaxed">
              The app hit an unexpected error. Tap retry to continue.
            </p>
            {this.state.message ? (
              <p className="text-[#4B5563] text-xs font-mono mt-1 break-all">{this.state.message}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="bg-[#2563EB] text-white font-bold text-sm px-8 py-3 rounded-2xl active:scale-95 transition-transform"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
