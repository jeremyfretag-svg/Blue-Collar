import { describe, it, expect, vi, beforeEach } from 'vitest'
import { versionMiddleware, deprecationWarning } from '../middleware/version.js'
import type { Request, Response, NextFunction } from 'express'

function mockReq(path: string): Partial<Request> {
  return { path } as any
}

function mockRes(): { headers: Record<string, string>; setHeader: ReturnType<typeof vi.fn> } {
  const headers: Record<string, string> = {}
  return {
    headers,
    setHeader: vi.fn((key: string, value: string) => { headers[key] = value }),
  }
}

describe('versionMiddleware', () => {
  it('sets X-API-Version to v1 for /api/v1/ paths', () => {
    const req = mockReq('/api/v1/workers') as any
    const res = mockRes() as any
    const next = vi.fn()
    versionMiddleware(req, res, next)
    expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1')
    expect(req.apiVersion).toBe('v1')
    expect(next).toHaveBeenCalled()
  })

  it('defaults to v1 for unversioned /api/ paths', () => {
    const req = mockReq('/api/workers') as any
    const res = mockRes() as any
    const next = vi.fn()
    versionMiddleware(req, res, next)
    expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1')
    expect(req.apiVersion).toBe('v1')
  })

  it('sets X-API-Version to v2 for /api/v2/ paths', () => {
    const req = mockReq('/api/v2/workers') as any
    const res = mockRes() as any
    const next = vi.fn()
    versionMiddleware(req, res, next)
    expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2')
    expect(req.apiVersion).toBe('v2')
  })
})

describe('deprecationWarning', () => {
  it('sets Deprecation, Warning, and Sunset headers', () => {
    const req = mockReq('/api/workers') as any
    const res = mockRes() as any
    const next = vi.fn()
    deprecationWarning(req, res, next)
    expect(res.headers['Deprecation']).toBe('true')
    expect(res.headers['Warning']).toContain('deprecated')
    expect(res.headers['Sunset']).toBeDefined()
    expect(next).toHaveBeenCalled()
  })
})
