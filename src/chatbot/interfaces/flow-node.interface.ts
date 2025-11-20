export enum FlowNodeType {
  START = 'start',
  MESSAGE = 'message',
  QUESTION = 'question',
  CONDITION = 'condition',
  API_CALL = 'api_call',
  SET_VARIABLE = 'set_variable',
  HANDOFF = 'handoff',
  END = 'end',
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  data: FlowNodeData;
  position?: { x: number; y: number };
}

export interface FlowNodeData {
  label?: string;
  message?: string;
  variable?: string;
  condition?: string;
  apiEndpoint?: string;
  apiMethod?: string;
  apiHeaders?: Record<string, string>;
  apiBody?: any;
  quickReplies?: QuickReply[];
  nextNode?: string;
}

export interface QuickReply {
  label: string;
  value: string;
  nextNode?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface FlowExecutionContext {
  sessionId: string;
  variables: Record<string, any>;
  contexts: string[];
  currentNode: string;
  visitedNodes: string[];
}
