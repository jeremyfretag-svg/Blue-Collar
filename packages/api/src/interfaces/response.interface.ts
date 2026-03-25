export interface ApiResponse<T = undefined> {
  status: 'success' | 'error'
  message: string
  code: number
  data?: T
  token?: string
}
