import { useState, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  Panel,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, Code, Plus, Trash2, Edit3, Save, X, Layout, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import type { JSONEditorProps } from "@/types/json-editor"

// Node data interface
interface NodeData {
  label: string
  value: unknown
  type: string
  level?: number
  onChange: (nodeId: string, newValue: unknown) => void
}

// Custom node types
const ObjectNode = ({ data, isConnectable }: { data: NodeData; isConnectable: boolean }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(data.value || ''))

  const handleSave = () => {
    data.onChange(data.label, editValue)
    setIsEditing(false)
  }

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[200px]">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">
          {data.type}
        </Badge>
        <span className="text-sm font-medium">{data.label}</span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Enter value..."
            className="text-xs"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} className="flex-1">
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground break-all">
            {typeof data.value === 'object' ? JSON.stringify(data.value) : String(data.value)}
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="w-full">
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  )
}

const ArrayNode = ({ data, isConnectable }: { data: NodeData; isConnectable: boolean }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(JSON.stringify(data.value || [], null, 2))

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editValue)
      data.onChange(data.label, parsed)
      setIsEditing(false)
    } catch (error) {
      // Handle invalid JSON
      console.error('Invalid JSON:', error)
    }
  }

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[200px] border-blue-200">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
          array
        </Badge>
        <span className="text-sm font-medium">{data.label}</span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Enter JSON array..."
            className="text-xs h-20"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} className="flex-1">
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            [{Array.isArray(data.value) ? data.value.length : 0} items]
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="w-full">
            <Edit3 className="h-3 w-3 mr-1" />
            Edit Array
          </Button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  )
}

const ValueNode = ({ data, isConnectable }: { data: NodeData; isConnectable: boolean }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(data.value || ''))

  const handleSave = () => {
    data.onChange(data.label, editValue)
    setIsEditing(false)
  }

  return (
    <div className="bg-card border rounded-lg shadow-lg p-3 min-w-[150px] border-green-200">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
          {data.type}
        </Badge>
        <span className="text-sm font-medium">{data.label}</span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Enter value..."
            className="text-xs"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave} className="flex-1">
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground break-all">
            {String(data.value)}
          </div>
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="w-full">
            <Edit3 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  object: ObjectNode,
  array: ArrayNode,
  value: ValueNode,
}

// Custom Controls Component
const CustomControls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 bg-background/80 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
      <Button
        size="sm"
        variant="outline"
        onClick={() => zoomIn()}
        className="h-8 w-8 p-0"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => zoomOut()}
        className="h-8 w-8 p-0"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => fitView()}
        className="h-8 w-8 p-0"
        title="Fit View"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Custom MiniMap Component
const CustomMiniMap = () => {
  return (
    <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
      <div className="text-xs text-muted-foreground mb-2 font-medium">Mini Map</div>
      <div className="w-24 h-18 bg-slate-900 rounded border overflow-hidden">
        <MiniMap
          nodeColor="#3b82f6"
          nodeStrokeColor="#1e40af"
          nodeStrokeWidth={2}
          maskColor="rgba(0, 0, 0, 0.3)"
          className="w-full h-full"
        />
      </div>
    </div>
  )
}

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function convertJsonToNodes(jsonData: unknown, parentId?: string): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  let nodeId = 0

  const processValue = (value: unknown, key: string, parent?: string): string => {
    const id = `node-${nodeId++}`
    const type = Array.isArray(value) ? 'array' : typeof value === 'object' && value !== null ? 'object' : 'value'
    
    // Use a more organized initial positioning
    const parentNode = nodes.find(n => n.id === parent)
    const parentLevel = parentNode ? (parentNode.data as NodeData & { level?: number })?.level || 0 : 0
    const level = parent ? parentLevel + 1 : 0
    const x = level * 400 + 200
    const y = (nodeId - 1) * 230 + 200
    
    nodes.push({
      id,
      type,
      position: { x, y },
      data: {
        label: key,
        value,
        type: typeof value,
        level,
        onChange: (nodeId: string, newValue: unknown) => {
          // Handle value change
          console.log('Value changed:', nodeId, newValue)
        }
      }
    })

    if (parent) {
      edges.push({
        id: `edge-${parent}-${id}`,
        source: parent,
        target: id,
        type: 'smoothstep'
      })
    }

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          processValue(item, `[${index}]`, id)
        })
      } else {
        Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
          processValue(v, k, id)
        })
      }
    }

    return id
  }

  if (typeof jsonData === 'object' && jsonData !== null) {
    if (Array.isArray(jsonData)) {
      jsonData.forEach((item, index) => {
        processValue(item, `[${index}]`, parentId)
      })
    } else {
      Object.entries(jsonData as Record<string, unknown>).forEach(([key, value]) => {
        processValue(value, key, parentId)
      })
    }
  }

  return { nodes, edges }
}

// Layout utility functions
function calculateHierarchicalLayout(nodes: Node[], edges: Edge[]) {
  // Create adjacency lists
  const children = new Map<string, string[]>()
  const parents = new Map<string, string>()
  
  // Initialize children map
  nodes.forEach(node => {
    children.set(node.id, [])
  })
  
  // Build parent-child relationships
  edges.forEach(edge => {
    const childList = children.get(edge.source) || []
    childList.push(edge.target)
    children.set(edge.source, childList)
    parents.set(edge.target, edge.source)
  })
  
  // Find root nodes (nodes with no parents)
  const rootNodes = nodes.filter(node => !parents.has(node.id))
  
  // Calculate positions using tree layout
  const nodePositions = new Map<string, { x: number, y: number }>()
  const levelHeight = 200
  const nodeSpacing = 300
  
  // Calculate subtree widths for proper centering
  const subtreeWidths = new Map<string, number>()
  
  function calculateSubtreeWidth(nodeId: string): number {
    const nodeChildren = children.get(nodeId) || []
    if (nodeChildren.length === 0) {
      return nodeSpacing
    }
    
    let totalWidth = 0
    nodeChildren.forEach(childId => {
      totalWidth += calculateSubtreeWidth(childId)
    })
    
    subtreeWidths.set(nodeId, totalWidth)
    return totalWidth
  }
  
  // Calculate widths for all root nodes
  rootNodes.forEach(rootNode => {
    calculateSubtreeWidth(rootNode.id)
  })
  
  function layoutNode(nodeId: string, level: number, xOffset: number): number {
    const nodeChildren = children.get(nodeId) || []
    const nodeWidth = subtreeWidths.get(nodeId) || nodeSpacing
    
    // Position current node
    const x = xOffset + nodeWidth / 2
    const y = level * levelHeight + 100
    nodePositions.set(nodeId, { x, y })
    
    // Position children
    if (nodeChildren.length > 0) {
      let childXOffset = xOffset
      nodeChildren.forEach(childId => {
        childXOffset += layoutNode(childId, level + 1, childXOffset)
      })
    }
    
    return nodeWidth
  }
  
  // Layout each root node
  let currentXOffset = 0
  rootNodes.forEach(rootNode => {
    const width = subtreeWidths.get(rootNode.id) || nodeSpacing
    layoutNode(rootNode.id, 0, currentXOffset)
    currentXOffset += width
  })
  
  // Update node positions
  return nodes.map(node => {
    const position = nodePositions.get(node.id)
    if (position) {
      return { ...node, position }
    }
    return node
  })
}

export function NodeBasedJSONEditor({ file }: JSONEditorProps) {
  const [isValid, setIsValid] = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  // Convert JSON to nodes on mount
  useMemo(() => {
    try {
      const { nodes: initialNodes, edges: initialEdges } = convertJsonToNodes(file.content)
      setNodes(initialNodes)
      setEdges(initialEdges)
      setIsValid(true)
      
      // Auto-layout after a short delay to ensure nodes are set
      setTimeout(() => {
        setNodes((currentNodes) => {
          const layoutedNodes = calculateHierarchicalLayout(currentNodes, initialEdges)
          return layoutedNodes
        })
      }, 100)
    } catch (error) {
      setIsValid(false)
      console.error('Invalid JSON:', error)
    }
  }, [file.content, setNodes, setEdges])

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds))
  }, [setEdges])

  const onNodeClick = useCallback((_event: unknown, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Auto-layout function
  const autoLayout = useCallback(() => {
    setNodes((currentNodes) => {
      const layoutedNodes = calculateHierarchicalLayout(currentNodes, edges)
      return layoutedNodes
    })
  }, [setNodes, edges])

  const addNewNode = useCallback(() => {
    const newNode: Node = {
      id: generateId(),
      type: 'value',
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      data: {
        label: 'New Node',
        value: '',
        type: 'string',
        onChange: (nodeId: string, newValue: unknown) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, value: newValue } }
                : node
            )
          )
        }
      }
    }
    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id))
      setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id))
      setSelectedNode(null)
    }
  }, [selectedNode, setNodes, setEdges])

  const getFileSize = () => {
    const size = JSON.stringify(file.content).length
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base">
          <div className="flex items-center gap-2 min-w-0">
            <Code className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{file.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {file.isModified && (
              <Badge variant="destructive" className="text-xs">
                Modified
              </Badge>
            )}
            <Badge variant={isValid ? "default" : "destructive"} className="text-xs">
              {isValid ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Valid
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Invalid
                </div>
              )}
            </Badge>
          </div>
        </CardTitle>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Size: {getFileSize()}</span>
          <span>Last modified: {new Date().toLocaleTimeString()}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isValid ? (
          <div className="h-[calc(100vh-200px)] w-full min-h-[600px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
              fitViewOptions={{ padding: 0.1 }}
              minZoom={0.1}
              maxZoom={2}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              proOptions={{ hideAttribution: true }}
            >
              <CustomControls />
              <CustomMiniMap />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
              
              <Panel position="top-left" className="bg-background/80 backdrop-blur-sm border rounded-lg p-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={addNewNode}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Node
                  </Button>
                  <Button size="sm" variant="outline" onClick={autoLayout}>
                    <Layout className="h-4 w-4 mr-1" />
                    Auto Layout
                  </Button>
                  {selectedNode && (
                    <Button size="sm" variant="destructive" onClick={deleteSelectedNode}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </Panel>

              <Panel position="top-right" className="bg-background/80 backdrop-blur-sm border rounded-lg p-2">
                <div className="text-xs text-muted-foreground">
                  {nodes.length} nodes, {edges.length} connections
                </div>
              </Panel>
            </ReactFlow>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm">Cannot edit structure of invalid JSON</p>
              <p className="text-xs text-muted-foreground">Fix the JSON format first</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 