import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import LoginForm from '../../../components/auth/LoginForm'
import authSlice from '../../../store/slices/authSlice'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props} onClick={(e) => { e.preventDefault(); mockNavigate(to); }}>
      {children}
    </a>
  )
}))

// Mock the auth service
vi.mock('../../../services/authService', () => ({
  login: vi.fn()
}))

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isLoading: false,
        error: null,
        ...initialState.auth
      }
    }
  })
}

const renderWithProvider = (component, { initialState = {} } = {}) => {
  const store = createMockStore(initialState)
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  }
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form elements', () => {
    renderWithProvider(<LoginForm />)
    
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    renderWithProvider(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email or username is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email format', async () => {
    renderWithProvider(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/email or username/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'invalid@email' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
  })

  it('accepts valid form input without client-side validation errors', async () => {
    renderWithProvider(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/email or username/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.queryByText(/email or username is required/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/please enter a valid email/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/password is required/i)).not.toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    renderWithProvider(<LoginForm />, {
      initialState: {
        auth: { isLoading: true }
      }
    })
    
    const submitButton = screen.getByRole('button', { name: /signing in/i })
    expect(submitButton).toBeDisabled()
  })

  it('displays error message on login failure', () => {
    renderWithProvider(<LoginForm />, {
      initialState: {
        auth: { error: { message: 'Invalid credentials' } }
      }
    })
    
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    renderWithProvider(<LoginForm />)
    
    const passwordInput = screen.getByLabelText(/^password$/i)
    const toggleButton = screen.getByLabelText(/toggle password visibility/i)
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('navigates to register page when register link is clicked', () => {
    renderWithProvider(<LoginForm />)
    
    const registerLink = screen.getByText(/create an account/i)
    fireEvent.click(registerLink)
    
    expect(mockNavigate).toHaveBeenCalledWith('/register')
  })

  it('handles demo mode button click', () => {
    const mockOnDemoMode = vi.fn()
    
    renderWithProvider(<LoginForm onDemoMode={mockOnDemoMode} />)
    
    const demoButton = screen.getByText(/try demo mode/i)
    fireEvent.click(demoButton)
    
    expect(mockOnDemoMode).toHaveBeenCalled()
  })
})