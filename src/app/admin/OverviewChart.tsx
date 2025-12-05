"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

// ข้อมูลจำลอง (Mock Data) เพราะเรายังไม่มีระบบเก็บ Stat รายวัน
// อนาคตคุณสามารถดึงจาก DB จริงมาใส่ตรงนี้ได้
const data = [
  { name: "Jan", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Feb", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Mar", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Apr", total: Math.floor(Math.random() * 0) + 0 },
  { name: "May", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Jun", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Jul", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Aug", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Sep", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Oct", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Nov", total: Math.floor(Math.random() * 0) + 0 },
  { name: "Dec", total: Math.floor(Math.random() * 0) + 0 },
]

export function OverviewChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar
          dataKey="total"
          fill="#10b981" // สีเขียว Primary ของเรา
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}