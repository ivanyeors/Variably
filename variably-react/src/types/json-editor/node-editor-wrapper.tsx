import { ReactFlowProvider } from '@xyflow/react'
import { NodeBasedJSONEditor } from './node-editor'
import type { JSONEditorProps } from '@/types/json-editor'

export function NodeBasedJSONEditorWrapper(props: JSONEditorProps) {
  return (
    <ReactFlowProvider>
      <NodeBasedJSONEditor {...props} />
    </ReactFlowProvider>
  )
} 