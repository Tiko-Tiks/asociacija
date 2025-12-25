import { mapServerError } from './error-mapping'

export function handleUiError(error: unknown) {
  const uiError = mapServerError(error)

  switch (uiError) {
    case 'AUTH':
      // example:
      // router.push('/login')
      return 'AUTH'

    case 'FORBIDDEN':
      // example:
      // toast.error('You do not have access')
      return 'FORBIDDEN'

    case 'INVALID':
      // example:
      // toast.error('Invalid input')
      return 'INVALID'

    case 'UNKNOWN':
    default:
      // example:
      // toast.error('Something went wrong')
      return 'UNKNOWN'
  }
}

