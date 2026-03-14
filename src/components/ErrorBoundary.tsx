import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md space-y-4">
            <h2 className="text-2xl font-bold text-red-500">Ops! Qualcosa è andato storto.</h2>
            <p className="text-zinc-400">
              Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
            </p>
            <pre className="text-[10px] bg-black/50 p-4 rounded-xl overflow-auto text-left text-zinc-500">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            >
              Ricarica App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
