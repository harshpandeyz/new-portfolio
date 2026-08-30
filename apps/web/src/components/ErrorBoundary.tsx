import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Public error boundary — if one subtree fails the site stays usable.
 * Pressing reload resets so the experience can recover without losing state.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("public error boundary caught:", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100svh", display: "grid", placeItems: "center", textAlign: "center", padding: "40px" }} role="alert">
          <div>
            <div className="mono mono-dim" style={{ marginBottom: 18 }}>Something went wrong.</div>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", marginBottom: 20 }}>This part of the site hit a snag.</h1>
            <button className="btn btn-solid" onClick={() => window.location.reload()}>Reload experience</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}