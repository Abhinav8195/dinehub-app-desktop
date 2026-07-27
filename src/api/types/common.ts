export interface ApiMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  meta?: ApiMeta
}

export interface ApiErrorBody {
  success: false
  statusCode: number
  message: string
  errors?: string[] | Record<string, string[]>
  path?: string
  timestamp?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export class ApiError extends Error {
  statusCode: number
  errors?: string[] | Record<string, string[]>
  path?: string

  constructor(body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.statusCode = body.statusCode
    this.errors = body.errors
    this.path = body.path
  }
}
