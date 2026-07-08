'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          padding: '20px',
          background: 'rgba(217, 58, 58, 0.1)',
          border: '1px solid rgba(217, 58, 58, 0.4)',
          borderRadius: '4px',
          color: '#d93a3a',
          fontSize: '12px',
          fontFamily: 'monospace',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontWeight: 800, marginBottom: '8px', letterSpacing: '0.1em' }}>⚠ COMPONENT ERROR</div>
          <div style={{ opacity: 0.8, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              marginTop: '12px',
              background: 'none',
              border: '1px solid rgba(217, 58, 58, 0.6)',
              color: '#d93a3a',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '4px 10px',
              letterSpacing: '0.08em',
              fontWeight: 700
            }}
          >
            RETRY
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
