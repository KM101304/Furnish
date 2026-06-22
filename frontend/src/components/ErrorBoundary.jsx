import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:"48px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"0.9rem", color:"#c0392b", marginBottom:16 }}>Something went wrong.</div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ background:"#2c2016", color:"#fff", border:"none", borderRadius:10, padding:"8px 20px", fontSize:"0.82rem", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
