'use client'

import { useState } from 'react'
import { useMutation } from '@connectrpc/connect-query'
import { operate } from '@/gen/calculator/v1/calculator-CalculatorService_connectquery'
import { Operation } from '@/gen/calculator/v1/calculator_pb'

export default function CalculatorPage() {
  const [displayValue, setDisplayValue] = useState('0')
  const [firstOperand, setFirstOperand] = useState<number | null>(null)
  const [operator, setOperator] = useState<Operation | null>(null)
  // 这个状态决定下一次数字输入是否应清除显示
  const [shouldClearDisplay, setShouldClearDisplay] = useState(false)
  const [lastOperationWasEquals, setLastOperationWasEquals] = useState(false);

  const { mutate, isPending, error } = useMutation(operate, {
    onSuccess: (res) => {
      // 默认的 onSuccess：通常在 '=' 之后或中间计算完成时调用
      setDisplayValue(String(res.result))

      // 如果刚刚成功的操作是由 '=' 触发的，则完全重置
      if (lastOperationWasEquals) {
          setFirstOperand(null)
          setOperator(null)
          setShouldClearDisplay(true) // 准备进行全新的计算
          setLastOperationWasEquals(false); // 重置标志
      } else {
          // 如果是中间计算（由另一个运算符触发）
          // 结果成为 *下一次* 操作的第一个操作数
          setFirstOperand(res.result)
          // 操作符状态已由 performOperation 设置
          setShouldClearDisplay(true) // 准备接收 *下一次* 操作的第二个操作数
      }
    },
    onError: () => {
      setDisplayValue('Error')
      setFirstOperand(null)
      setOperator(null)
      setShouldClearDisplay(true)
      setLastOperationWasEquals(false);
    },
  })

  const inputDigit = (digit: string) => {
    if (displayValue === 'Error' || shouldClearDisplay) {
      setDisplayValue(digit)
      setShouldClearDisplay(false)
    } else {
      setDisplayValue(displayValue === '0' ? digit : displayValue + digit)
    }
    setLastOperationWasEquals(false); // 输入数字总是会中断连续按 '=' 的可能性
  }

  const inputDecimal = () => {
    setLastOperationWasEquals(false);
    if (shouldClearDisplay) {
      setDisplayValue('0.')
      setShouldClearDisplay(false)
      return
    }
    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.')
    }
  }

  const clearAll = () => {
    setDisplayValue('0')
    setFirstOperand(null)
    setOperator(null)
    setShouldClearDisplay(false)
    setLastOperationWasEquals(false);
  }

  const backspace = () => {
    if (shouldClearDisplay || displayValue === 'Error' || displayValue.length === 1) {
      setDisplayValue('0')
      setShouldClearDisplay(false) // 允许立即输入
    } else {
      setDisplayValue(displayValue.slice(0, -1))
    }
     setLastOperationWasEquals(false);
  }

  const toggleSign = () => {
     setLastOperationWasEquals(false);
    if (displayValue !== 'Error') {
        const currentValue = parseFloat(displayValue)
        if (currentValue !== 0) { // 不要切换 0 的符号
        setDisplayValue(String(currentValue * -1))
        }
    }
  }

  const performOperation = (nextOperator: Operation) => {
    const inputValue = parseFloat(displayValue)

    // 如果处于错误状态，则阻止计算
     if (displayValue === 'Error') return;

    // 处理连续按运算符的情况 (例如 5 * - 3)
    // 只更新运算符，除非是在按了 '=' 之后
    if (operator && shouldClearDisplay && !lastOperationWasEquals) {
      setOperator(nextOperator);
      return;
    }

     setLastOperationWasEquals(false); // 按下运算符会重置此标志

    // 如果存在待处理的操作并且我们已经输入了第二个操作数
    if (operator && firstOperand !== null && !shouldClearDisplay) {
      mutate({
        operandA: firstOperand,
        operandB: inputValue,
        operation: operator, // 使用现有的运算符进行计算
      })
      // onSuccess 将处理把结果设置为 firstOperand
      // 现在我们设置刚刚按下的 *下一个* 运算符
       setOperator(nextOperator)
       // setShouldClearDisplay 由 onSuccess 处理
    } else {
      // 这是第一次按下运算符，或在 '=' 之后进行链式操作
      setFirstOperand(inputValue)
      setOperator(nextOperator)
      setShouldClearDisplay(true)
    }
  }

  const handleEquals = () => {
    const inputValue = parseFloat(displayValue)

    // 如果是错误状态或没有足够信息进行计算，则阻止计算
    if (displayValue === 'Error' || operator === null || firstOperand === null || shouldClearDisplay) {
        // 如果用户在计算后重复按 '='，则继续显示结果
        if (!lastOperationWasEquals && !shouldClearDisplay) {
             // 或者如果按下 '=' 时没有准备好完整的操作，则不执行任何操作
             return;
        }
       return;
    }


    // 在调用 mutate *之前* 设置标志
    setLastOperationWasEquals(true);

    mutate({
      operandA: firstOperand,
      operandB: inputValue,
      operation: operator,
    })
     // 默认的 onSuccess 将处理状态重置，因为 lastOperationWasEquals 为 true
  }

  // 按钮组件，用于样式一致性
  const CalculatorButton = ({ onClick, label, className = '' }: { onClick: () => void; label: string; className?: string }) => (
    <button
      onClick={onClick}
      className={`text-xl font-semibold p-4 rounded shadow active:shadow-inner focus:outline-none ${className}`}
    >
      {label}
    </button>
  )

  // 定义按钮样式
  const numberStyle = 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-black dark:text-white'
  const operatorStyle = 'bg-yellow-500 hover:bg-yellow-600 text-white'
  const functionStyle = 'bg-orange-500 hover:bg-orange-600 text-white' // 用于 C, 退格
  const equalsStyle = 'bg-green-500 hover:bg-green-600 text-white col-span-1' // 等于按钮样式

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4">
        {/* 显示屏 */}
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-4 mb-4 text-right overflow-hidden">
          <span className="block text-3xl font-mono text-black dark:text-white break-all">{displayValue}</span>
        </div>

        {/* 按钮网格 */}
        <div className="grid grid-cols-4 gap-2">
          {/* 行 1: C, 退格, +/-, / */}
          <CalculatorButton onClick={clearAll} label="C" className={functionStyle + " col-span-1"} />
          <CalculatorButton onClick={backspace} label="退格" className={functionStyle + " col-span-1"} />
          <CalculatorButton onClick={toggleSign} label="+/-" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.DIVIDE)} label="÷" className={operatorStyle} />

          {/* 行 2: 7, 8, 9, * */}
          <CalculatorButton onClick={() => inputDigit('7')} label="7" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('8')} label="8" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('9')} label="9" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.MULTIPLY)} label="x" className={operatorStyle} />

          {/* 行 3: 4, 5, 6, - */}
          <CalculatorButton onClick={() => inputDigit('4')} label="4" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('5')} label="5" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('6')} label="6" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.SUBTRACT)} label="-" className={operatorStyle} />

          {/* 行 4: 1, 2, 3, + */}
          <CalculatorButton onClick={() => inputDigit('1')} label="1" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('2')} label="2" className={numberStyle} />
          <CalculatorButton onClick={() => inputDigit('3')} label="3" className={numberStyle} />
          <CalculatorButton onClick={() => performOperation(Operation.ADD)} label="+" className={operatorStyle} />

          {/* 行 5: 0, ., = */}
          <CalculatorButton onClick={() => inputDigit('0')} label="0" className={numberStyle + " col-span-2"} />
          <CalculatorButton onClick={inputDecimal} label="." className={numberStyle} />
          <CalculatorButton onClick={handleEquals} label="=" className={equalsStyle} />

        </div>
        {/* 状态消息容器，具有固定高度以防止抖动 */}
        <div className="h-6 mt-2 text-center text-xs"> {/* 调整 h-6 (1.5rem) 如果需要 */}
            {isPending && (
            <p className="text-blue-500">Calculating...</p>
            )}
            {error && (
            <p className="text-red-500">API Error: {error.message}</p>
            )}
        </div>
      </div>
    </div>
  )
} 