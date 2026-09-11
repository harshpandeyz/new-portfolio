import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Public error boundary — if one subtree fails the site stays usable.
 * Offers in-place retry (resets state) plus full reload as fallback.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("public error boundary caught:", error, info);
  }

  private retry = () => this.setState({ hasError: false });

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100svh", display: "grid", placeItems: "center", textAlign: "center", padding: "40px" }} role="alert">
          <div>
            <div className="mono mono-dim" style={{ marginBottom: 18 }}>Something went wrong.</div>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", marginBottom: 20 }}>This part of the site hit a snag.</h1>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button type="button" className="btn btn-solid" onClick={this.retry}>Try again</button>
              <button type="button" className="btn" onClick={() => window.location.reload()}>Reload experience</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}