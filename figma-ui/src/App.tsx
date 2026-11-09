import { useState } from 'react'
import { Prototype } from './prototype/Prototype'
import { ProtoProvider } from './prototype/store'
import './prototype/prototype.css'

export default function App() {
  const [run, setRun] = useState(0)
  return (
    <ProtoProvider key={run}>
      <Prototype onRestart={() => setRun((r) => r + 1)} />
    </ProtoProvider>
  )
}
