import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#0D1B2A", color: "white", padding: 24, fontFamily: "monospace" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Something went wrong</h1>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#FCA5A5" }}>
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}