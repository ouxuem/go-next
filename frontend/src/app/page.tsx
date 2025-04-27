'use client'

import Image from "next/image";
import { useState } from 'react'
import { useQuery } from '@connectrpc/connect-query'
import { greet } from '@/gen/greet/v1/greet-GreetService_connectquery'

export default function Home() {
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | undefined>(undefined)

  const { data, isLoading, error, refetch } = useQuery(
    // 直接使用导入的 greet 方法
    greet,
    // 如果 name 或 age 为空，则禁用查询
    name === '' || age === undefined ? undefined : { name, age: age ?? 0 },
    {
      enabled: false, // 初始禁用，点击按钮时手动触发
    },
  )

  const handleGreet = () => {
    if (name && age !== undefined)
      void refetch() // 手动触发查询
  }

  return (
    <div className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入你的名字"
              className="px-4 py-2 border rounded text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
            <input
              type="number"
              value={age ?? ''}
              onChange={(e) => setAge(e.target.value === '' ? undefined : parseInt(e.target.value, 10) || 0)}
              placeholder="年龄"
              className="px-4 py-2 border rounded text-black dark:text-white bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 w-20"
            />
            <button
              onClick={handleGreet}
              disabled={!name || age === undefined || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {isLoading ? '加载中...' : '发送问候'}
            </button>
          </div>

          {error && (
            <p className="text-red-500">错误: {error.message}</p>
          )}
          {data && (
            <p className="text-lg font-semibold">{data.greeting}</p>
          )}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
