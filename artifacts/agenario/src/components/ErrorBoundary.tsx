import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Agenario] Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
          <div className="text-center space-y-5 max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-white/80 text-base font-semibold">Something went wrong</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                An unexpected error occurred. Please reload the page.
              </p>
              {this.state.error && (
                <pre className="text-left mt-3 p-3 bg-white/[0.03] border border-white/[0.07] rounded-xl text-[11px] text-red-400/70 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="font-bold text-sm px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black transition-all"
              >
                Reload Page
              </button>
              <button
                onClick={() => { window.location.href = "/dashboard"; }}
                className="text-sm text-white/35 hover:text-white/55 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
