import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import * as authService from '../services/auth.service.js'
import { handleError } from '../utils/handleError.js'
import type { LoginBody, RegisterBody, ForgotPasswordBody, ResetPasswordBody } from '../interfaces/index.js'

export async function login(req: Request<{}, {}, LoginBody>, res: Response) {
  try {
    const { data, token } = await authService.loginUser(req.body)
    return res.status(202).json({ data, status: 'success', message: 'Login successful', code: 202, token })
  } catch (err) {
    return handleError(res, err)
  }
}

export async function register(req: Request<{}, {}, RegisterBody>, res: Response) {
  try {
    const data = await authService.registerUser(req.body)
    return res.status(201).json({
      data,
      status: 'success',
      message: 'Registration successful. Please check your email to verify your account.',
      code: 201,
    })
  } catch (err) {
    return handleError(res, err)
  }
import { AppError } from '../services/AppError.js'
import * as authService from '../services/auth.service.js'

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ status: 'error', message: err.message, code: err.statusCode })
  }
  console.error(err)
  return res.status(500).json({ status: 'error', message: 'Internal server error', code: 500 })
}

export async function login(req: Request, res: Response) {
  try {
    const { data, token } = await authService.loginUser(req.body.email, req.body.password)
    return res.status(202).json({ data, status: 'success', message: 'Login successful', code: 202, token })
  } catch (err) {
    return handleError(res, err)
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName } = req.body
    const data = await authService.registerUser(email, password, firstName, lastName)
    return res.status(201).json({
      data,
      status: 'success',
      message: 'Registration successful. Please check your email to verify your account.',
      code: 201,
    })
  } catch (err) {
    return handleError(res, err)
  }
}

export async function verifyAccount(req: Request, res: Response) {
  const token = (req.query.token ?? req.body.token) as string | undefined
  if (!token) {
    return res.status(400).json({ status: 'error', message: 'Verification token is required', code: 400 })
  }
  try {
    const verified = await authService.verifyAccount(token)
    const message = verified ? 'Email verified successfully' : 'Email already verified'
    return res.status(200).json({ status: 'success', message, code: 200 })
  } catch (err) {
    await authService.verifyAccount(token)
    return res.status(200).json({ status: 'success', message: 'Email verified successfully', code: 200 })
  } catch (err) {
    if (err instanceof AppError && err.statusCode === 200) {
      return res.status(200).json({ status: 'success', message: 'Email already verified', code: 200 })
    }
    return handleError(res, err)
  }
}

export async function googleAuthCallback(req: Request, res: Response) {
  const user = req.user as any
  if (!user) return res.redirect(`${process.env.APP_URL}/login?error=oauth-failed`)
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '7d' })
  return res.redirect(`${process.env.APP_URL}/auth-callback?token=${token}`)
}

export async function logout(_req: Request, res: Response) {
  return res.status(200).json({ status: 'success', message: 'Logged out', code: 200 })
}

export async function forgotPassword(req: Request<{}, {}, ForgotPasswordBody>, res: Response) {
export async function forgotPassword(req: Request, res: Response) {
  await authService.requestPasswordReset(req.body.email)
  return res.status(200).json({
    status: 'success',
    message: 'If an account exists with that email, a password reset link has been sent.',
    code: 200,
  })
}

export async function resetPassword(req: Request<{}, {}, ResetPasswordBody>, res: Response) {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ status: 'error', message: 'Token and password are required', code: 400 })
  }
  try {
    await authService.resetPassword(token, password)
    return res.status(200).json({ status: 'success', message: 'Password reset successful', code: 200 })
  } catch (err) {
    return handleError(res, err)
  }
}
