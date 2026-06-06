import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 28 }}>
          <div className="errmsg card">
            <div style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ marginBottom: 14, color: 'var(--muted)' }}>The application encountered an unexpected error.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => this.setState({ error: null })}>Try Again</button>
              <button className="btn btn-ghost" onClick={() => { this.setState({ error: null }); window.location.hash = '#/'; }}>Go to Home</button>
              <button className="btn btn-ghost" onClick={() => location.reload()}>Reload Page</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
