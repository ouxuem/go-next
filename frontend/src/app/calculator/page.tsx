'use client'

import { useState } from 'react'
import { useMutation } from '@connectrpc/connect-query'
import { operate } from '@/gen/calculator/v1/calculator-CalculatorService_connectquery'
import { Operation } from '@/gen/calculator/v1/calculator_pb'

export default function CalculatorPage() {
  const [displayValue, setDisplayValue] = useState('0')
  const [firstOperand, setFirstOperand] = useState<number | null>(null)
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false)
  const [operator, setOperator] = useState<Operation | null>(null)

  // Default mutation options (used for '=')
  const defaultMutationOptions = {
    onSuccess: (res: { result: number }) => {
      setDisplayValue(String(res.result))
      setFirstOperand(null) // Reset after equals
      setWaitingForSecondOperand(true) // Ready for new input
      setOperator(null)
    },
    onError: (err: Error) => {
      setDisplayValue('Error')
      setFirstOperand(null)
      setWaitingForSecondOperand(false)
      setOperator(null)
    },
  }

  const { mutate, isPending, error } = useMutation(operate, defaultMutationOptions)

  const inputDigit = (digit: string) => {
    if (displayValue === 'Error') {
      setDisplayValue(digit)
      return
    }
    if (waitingForSecondOperand) {
      setDisplayValue(digit)
      setWaitingForSecondOperand(false)
    } else {
      // Prevent multiple leading zeros, handle initial zero
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit)
    }
  }

  const inputDecimal = () => {
    if (displayValue === 'Error') {
      setDisplayValue('0.')
      setWaitingForSecondOperand(false)
      return
    }
    if (waitingForSecondOperand) {
      setDisplayValue('0.')
      setWaitingForSecondOperand(false)
      return
    }
    // Prevent multiple decimals
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.')
    }
  }

  const clearAll = () => {
    setDisplayValue('0')
    setFirstOperand(null)
    setWaitingForSecondOperand(false)
    setOperator(null)
  }

  const backspace = () => {
    if (displayValue === 'Error' || displayValue.length === 1) {
      setDisplayValue('0')
    } else {
      setDisplayValue(displayValue.slice(0, -1))
    }
  }

  const toggleSign = () => {
    const currentValue = parseFloat(displayValue)
    if (currentValue !== 0) { // Don't toggle sign for zero
      setDisplayValue(String(currentValue * -1))
    }
  }

  const performOperation = (nextOperator: Operation) => {
    const inputValue = parseFloat(displayValue)

    // If an operator is pending and we just entered the second operand
    if (operator && !waitingForSecondOperand) {
      if (firstOperand !== null) {
        // Trigger mutate with specific onSuccess for intermediate calculation
        mutate(
          { // Payload
            operandA: firstOperand,
            operandB: inputValue,
            operation: operator,
          },
          { // Options specific to this intermediate call
            onSuccess: (res) => {
              setDisplayValue(String(res.result))
              setFirstOperand(res.result) // Store intermediate result
              setOperator(nextOperator) // Set the NEW operator
              setWaitingForSecondOperand(true) // Wait for next operand
            },
            onError: defaultMutationOptions.onError, // Use default error handling
          }
        )
        return // Let the callback handle further state updates
      }
    }

    // Otherwise (no operation pending, or chaining operators immediately like 5 * + 3)
    // Store current value and set the new operator.
    setFirstOperand(inputValue)
    setOperator(nextOperator)
    setWaitingForSecondOperand(true)
  }

  const handleEquals = () => {
    const inputValue = parseFloat(displayValue)
    // Only calculate if an operator is set, a first operand exists,
    // and we are NOT waiting for the second operand (meaning it has been entered)
    if (operator && firstOperand !== null && !waitingForSecondOperand) {
      // Trigger mutate using the default options (onSuccess resets state)
      mutate({ // Payload only
        operandA: firstOperand,
        operandB: inputValue,
        operation: operator,
      })
    }
  }

  // Button component for styling consistency
  const CalculatorButton = ({ onClick, label, className = '' }: { onClick: () => void; label: string; className?: string }) => (
    <button
      onClick={onClick}
      className={`text-xl font-semibold p-4 rounded shadow active:shadow-inner focus:outline-none ${className}`}
    >
      {label}
    </button>
  )

  // Define button styles
  const numberStyle = 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white'
  const operatorStyle = 'bg-yellow-500 hover:bg-yellow-600 text-white'
  const functionStyle = 'bg-orange-500 hover:bg-orange-600 text-white' // For C, Backspace
  const equalsStyle = 'bg-green-500 hover:bg-green-600 text-white col-span-1' // Equals button style

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4">
        {/* Display */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-4 mb-4 text-right overflow-hidden">
          <span className="block text-3xl font-mono text-black dark:text-white break-all">{displayValue}</span>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Row 1: C, Backspace, +/-, / */}
          <CalculatorButton onClick={clearAll} label="C" className={functionStyle + " col-span-1"} />
          <CalculatorButton onClick={backspace} label="退格" className={functionStyle + " col-span-1"} />
          <CalculatorButton onClick={toggleSign} label="+/-" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.DIVIDE)} label="÷" className={operatorStyle} />

          {/* Row 2: 7, 8, 9, * */}
          <CalculatorButton onClick={() => inputDigit('7')} label="7" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('8')} label="8" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('9')} label="9" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.MULTIPLY)} label="x" className={operatorStyle} />

          {/* Row 3: 4, 5, 6, - */}
          <CalculatorButton onClick={() => inputDigit('4')} label="4" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('5')} label="5" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('6')} label="6" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.SUBTRACT)} label="-" className={operatorStyle} />

          {/* Row 4: 1, 2, 3, + */}
          <CalculatorButton onClick={() => inputDigit('1')} label="1" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('2')} label="2" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('3')} label="3" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.ADD)} label="+" className={operatorStyle} />

          {/* Row 5: 0, ., = */}
          <CalculatorButton onClick={() => inputDigit('0')} label="0" className={numberStyle + " col-span-2"} />
          <CalculatorButton onClick={inputDecimal} label="." className={numberStyle} />
          <CalculatorButton onClick={handleEquals} label="=" className={equalsStyle} />

        </div>
        {/* Optional: Display API Error somewhere specific if needed */}
        {/* Display pending state indicator */}
        {isPending && (
          <p className="text-blue-500 text-center mt-2 text-xs">Calculating...</p>
        )}
        {error && (
          <p className="text-red-500 text-center mt-2 text-xs">API Error: {error.message}</p>
        )}
      </div>
    </div>
  )
} 