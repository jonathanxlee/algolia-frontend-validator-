import React from 'react'

interface BatchHeaderProps {
  batchId: string
  count: number
  level: number
}

export function BatchHeader({ batchId, count, level }: BatchHeaderProps) {
  return (
    <div 
      className="batch-header"
      style={{ marginLeft: `${level * 20}px` }}
    />
  )
}
