export interface LoginBody {
  email: string
  password: string
}

export interface RegisterBody {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface ForgotPasswordBody {
  email: string
}

export interface ResetPasswordBody {
  token: string
  password: string
}
