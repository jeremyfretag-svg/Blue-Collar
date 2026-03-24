/**
 * Unit tests for the authentication and account management flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

// ─── Env setup ───────────────────────────────────────────────────────────────
process.env.JWT_SECRET = 'test-secret'
process.env.APP_URL = 'http://localhost:3000'

// ─── Mocks ───────────────────────────────────────────────────────────────────
vi.mock('../db.js', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../mailer/index.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}))

// Import AFTER mocks are registered
import { db } from '../db.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../mailer/index.js'
import {
  login,
  register,
  verifyAccount,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────
type MockResponse = {
  statusCode: number
  body: Record<string, unknown>
  status: (code: number) => MockResponse
  json: (data: Record<string, unknown>) => MockResponse
  redirect: (url: string) => void
}

function makeRes(): MockResponse {
  const res = {
    statusCode: 200,
    body: {},
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: Record<string, unknown>) {
      this.body = data
      return this
    },
    redirect: vi.fn(),
  }
  return res
}

function makeReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, query: {}, headers: {}, ...overrides }
}

/** Hash a raw token the same way the controller does. */
function sha256(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Sign a verification JWT. */
function signVerificationToken(userId: string, expiresIn = '24h') {
  return jwt.sign({ id: userId, purpose: 'email-verify' }, process.env.JWT_SECRET!, { expiresIn })
}

// ─── Test definitions ─────────────────────────────────────────────────────────

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a user, stores hashed token, and sends a verification email', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      role: 'user',
      verified: false,
    }

    ;(db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(db.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
    ;(db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

    const req = makeReq({
      body: { email: 'alice@example.com', password: 'secret', firstName: 'Alice', lastName: 'Smith' },
    })
    const res = makeRes()

    await register(req, res as any)

    expect(res.statusCode).toBe(201)
    expect(res.body.status).toBe('success')

    // verificationToken hash must have been stored
    const updateCall = (db.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.data.verificationToken).toBeTruthy()

    // sendVerificationEmail must have been called
    expect(sendVerificationEmail).toHaveBeenCalledOnce()
  })

  it('returns 409 when email is already registered', async () => {
    ;(db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'existing' })

    const req = makeReq({
      body: { email: 'alice@example.com', password: 'secret', firstName: 'Alice', lastName: 'Smith' },
    })
    const res = makeRes()

    await register(req, res as any)

    expect(res.statusCode).toBe(409)
  })
})

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 403 when user is not verified', async () => {
    ;(db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      password: await import('argon2').then((m) => m.hash('secret')),
      verified: false,
      role: 'user',
    })

    const req = makeReq({ body: { email: 'alice@example.com', password: 'secret' } })
    const res = makeRes()

    await login(req, res as any)

    expect(res.statusCode).toBe(403)
  })

  it('returns 202 and token for verified user with correct credentials', async () => {
    const argon2 = await import('argon2')
    const hashedPw = await argon2.hash('secret')

    ;(db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      role: 'user',
      verified: true,
      password: hashedPw,
    })

    const req = makeReq({ body: { email: 'alice@example.com', password: 'secret' } })
    const res = makeRes()

    await login(req, res as any)

    expect(res.statusCode).toBe(202)
    expect(res.body.token).toBeTruthy()
  })
})

describe('verifyAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verifies the account and returns 200 for a valid token', async () => {
    const validToken = signVerificationToken('user-1')
    const hash = sha256(validToken)

    ;(db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      verified: false,
      verificationToken: hash,
      verificationTokenExpiry: new Date(Date.now() + 60_000),
    })
    ;(db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-1', verified: true })

    const req = makeReq({ query: { token: validToken } })
    const res = makeRes()

    await verifyAccount(req, res as any)

    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('success')

    const updateCall = (db.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.data.verified).toBe(true)
  })
})

describe('forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('always returns 200, but only sends email if user exists', async () => {
    // User exists
    ;(db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
    })
    ;(db.user.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

    const req1 = makeReq({ body: { email: 'alice@example.com' } })
    const res1 = makeRes()
    await forgotPassword(req1, res1 as any)

    expect(res1.statusCode).toBe(200)
    expect(sendPasswordResetEmail).toHaveBeenCalledOnce()

    // User does not exist
    ;(db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)
    const req2 = makeReq({ body: { email: 'nobody@example.com' } })
    const res2 = makeRes()
    await forgotPassword(req2, res2 as any)

    expect(res2.statusCode).toBe(200)
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1) // from first call only
  })
})

describe('resetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for an invalid or expired token', async () => {
    ;(db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const req = makeReq({ body: { token: 'invalid', password: 'new-password' } })
    const res = makeRes()
    await resetPassword(req, res as any)

    expect(res.statusCode).toBe(400)
  })

  it('updates the password and clears reset fields for a valid token', async () => {
    const rawToken = 'secret-reset-token'
    
    ;(db.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-123',
      email: 'bob@example.com',
    })
    ;(db.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-123' })

    const req = makeReq({ body: { token: rawToken, password: 'new-secure-password' } })
    const res = makeRes()

    await resetPassword(req, res as any)

    expect(res.statusCode).toBe(200)
    expect(res.body.status).toBe('success')

    const updateCall = (db.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateCall.data.password).toBeTruthy()
    expect(updateCall.data.resetToken).toBeNull()
  })
})
