import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import Vitest functions
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { Operation } from '@/gen/calculator/v1/calculator_pb'
import CalculatorPage from './page'

// --- State for our Mock Hook ---
let mockIsPending = false
let mockError: Error | null = null
let mockData: { result: number } | null = null
let lastMutationOptions: any = null // To store callbacks
const mockMutate = vi.fn()

vi.mock('@connectrpc/connect-query', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    // Make the hook return our mock state variables
    useMutation: vi.fn((_mutationFn, defaultOptions) => ({
      mutate: (payload: any, options?: any) => {
        lastMutationOptions = options ?? defaultOptions
        mockIsPending = true // Simulate pending state on call
        mockError = null
        mockData = null
        mockMutate(payload, lastMutationOptions) // Track the call
        // In a real scenario, the library would handle async completion
        // Here, we rely on simulateApiSuccess/Error to change state
      },
      // Return the current mock state
      isPending: mockIsPending,
      error: mockError,
      data: mockData,
    })),
  }
})

// Helper to simulate API success
const simulateApiSuccess = (result: number) => {
  mockIsPending = false
  mockError = null
  mockData = { result } // Set mock data
  if (lastMutationOptions?.onSuccess) {
    lastMutationOptions.onSuccess({ result })
  }
}

// Helper to simulate API error
const simulateApiError = (errorMessage: string) => {
  const error = new Error(errorMessage)
  mockIsPending = false
  mockError = error // Set mock error
  mockData = null
  if (lastMutationOptions?.onError) {
    lastMutationOptions.onError(error)
  }
}

describe('CalculatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastMutationOptions = null
    // Reset mock state before each test
    mockIsPending = false
    mockError = null
    mockData = null
  })

  test('renders initial display correctly', () => {
    render(<CalculatorPage />)
    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument()
  })

  test('handles digit input', async () => {
    const user = userEvent.setup()
    render(<CalculatorPage />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(screen.getByText('123', { selector: 'span' })).toBeInTheDocument()
  })

  test('handles decimal input', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '.' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '.' })); // Second decimal ignored
    await user.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByText('1.23', { selector: 'span' })).toBeInTheDocument();
  });

  test('handles clear button (C)', async () => {
    const user = userEvent.setup()
    render(<CalculatorPage />)
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'C' }))
    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '5' }));
    expect(screen.getByText('5', { selector: 'span' })).toBeInTheDocument()
  })

  test('handles backspace button', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: '退格' }));
    expect(screen.getByText('12', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '退格' }));
    expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '退格' }));
    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument();
  });

  test('handles toggle sign button (+/-)', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: '+/-' }));
    expect(screen.getByText('-5', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+/-' }));
    expect(screen.getByText('5', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'C' }));
    await user.click(screen.getByRole('button', { name: '+/-' }));
    expect(screen.getByText('0', { selector: 'span' })).toBeInTheDocument();
  });

  test('performs simple addition (2 + 3 = 5)', async () => {
    const user = userEvent.setup()
    render(<CalculatorPage />)
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: '+' }))
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: '=' }))
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate).toHaveBeenCalledWith(
      { operandA: 2, operandB: 3, operation: Operation.ADD },
      expect.anything()
    )
    simulateApiSuccess(5)
    // Wait for the display to update
    await waitFor(() => {
      expect(screen.getByText('5', { selector: 'span' })).toBeInTheDocument()
    })
  })

  test('performs chained multiplication (5 * 2 * 3 = 30)', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'x' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'x' }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { operandA: 5, operandB: 2, operation: Operation.MULTIPLY },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    simulateApiSuccess(10);
    // Wait for the intermediate display update
    await waitFor(() => {
        expect(screen.getByText('10', { selector: 'span' })).toBeInTheDocument();
    })
    await user.click(screen.getByRole('button', { name: '3' }));
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenCalledWith(
      { operandA: 10, operandB: 3, operation: Operation.MULTIPLY },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    simulateApiSuccess(30);
    // Wait for the final display update
    await waitFor(() => {
        expect(screen.getByText('30', { selector: 'span' })).toBeInTheDocument();
    })
  });

  test('handles division by zero error', async () => {
    const user = userEvent.setup()
    render(<CalculatorPage />)
    await user.click(screen.getByRole('button', { name: '9' }))
    await user.click(screen.getByRole('button', { name: '÷' }))
    await user.click(screen.getByRole('button', { name: '0' }))
    await user.click(screen.getByRole('button', { name: '=' }))
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate).toHaveBeenCalledWith(
      { operandA: 9, operandB: 0, operation: Operation.DIVIDE },
      expect.anything()
    )

    const errorMessage = 'division by zero'
    simulateApiError(errorMessage)

    // Re-rendering might be needed if state updates don't trigger it automatically in test
    // For simple cases, waitFor often handles it.
    await waitFor(() => {
      expect(screen.getByText('Error', { selector: 'span' })).toBeInTheDocument()
      // Now this should find the element because the mock hook returns an error object
      expect(screen.getByText(`API Error: ${errorMessage}`)).toBeInTheDocument()
    })
  })

  test('correctly handles the specific bug case (22 * 2 +/- * 2 = -88)', async () => {
    const user = userEvent.setup();
    render(<CalculatorPage />);
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: 'x' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '+/-' }));
    expect(screen.getByText('-2', { selector: 'span' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'x' }));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      { operandA: 22, operandB: -2, operation: Operation.MULTIPLY },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    simulateApiSuccess(-44);
    // Wait for the intermediate display update
    await waitFor(() => {
        expect(screen.getByText('-44', { selector: 'span' })).toBeInTheDocument();
    })
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '=' }));
    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenCalledWith(
      { operandA: -44, operandB: 2, operation: Operation.MULTIPLY },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
    simulateApiSuccess(-88);
    // Wait for the final display update
    await waitFor(() => {
        expect(screen.getByText('-88', { selector: 'span' })).toBeInTheDocument();
    })
  });
}) 