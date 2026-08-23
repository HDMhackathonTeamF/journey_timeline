import React, { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary caught an error]', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px',
          maxWidth: '680px',
          margin: '40px auto',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          fontFamily: 'sans-serif'
        }}>
          <h2 style={{ color: '#e53e3e', marginTop: 0 }}>⚠️ 画面の描画中にエラーが発生しました</h2>
          <p style={{ color: '#4a5568' }}>
            予期せぬエラーが発生したため、画面を正常に表示できませんでした。
          </p>
          <div style={{
            background: '#f7fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '16px',
            margin: '16px 0',
            overflowX: 'auto'
          }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#c53030' }}>
              {this.state.error?.name}: {this.state.error?.message}
            </p>
            {this.state.error?.stack && (
              <pre style={{ fontSize: '0.8rem', color: '#718096', margin: '8px 0 0 0', whiteSpace: 'pre-wrap' }}>
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                background: '#3182ce',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ページを再読み込み
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/' }}
              style={{
                padding: '8px 16px',
                background: '#edf2f7',
                color: '#2d3748',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ホームへ戻る
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
