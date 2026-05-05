import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    try {
      if (window.__sentry__) window.__sentry__.captureException(error);
    } catch {
      /* ignore */
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
            <p className="text-slate-500 text-sm">
              This page encountered an error. Your data is safe. Please try refreshing.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />Try Again
              </Button>
              <Button onClick={() => { window.location.href = "/"; }} className="bg-blue-600 hover:bg-blue-700">
                <Home className="w-4 h-4 mr-2" />Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
