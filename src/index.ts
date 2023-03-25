import {AllGraphNodes, Graph, GraphNode, Id, IId, NodesMaps} from './types';

type NullOrNode<GraphNodes, K extends keyof GraphNodes> = null | (NodesMaps<GraphNodes>[K] extends Map<Id, infer Node> ? Node : never);

// export function getNode<GraphNodes, K extends keyof GraphNodes>(
//   graph: Graph<GraphNodes>,
//   nodeId: IId<K>
// ): NullOrNode<GraphNodes, K>;
export function getNode<GraphNodes, K extends keyof GraphNodes>(
  graph: Graph<GraphNodes>,
  inpNodeType: K,
  inpNodeId: Id
): NullOrNode<GraphNodes, K> {
// export function getNode<GraphNodes, K extends keyof GraphNodes>(
//   graph: Graph<GraphNodes>,
//   inpNodeType: K | IId<K>,
//   inpNodeId?: Id
// ): NullOrNode<GraphNodes, K> {
  let nodeType: K;
  let nodeId: Id;
  if (typeof inpNodeType === 'object') {
    if (!inpNodeType) {
      throw new TypeError('We need an actual Id object');
    }
    nodeType = inpNodeType.__typename;
    nodeId = inpNodeType._id;
  } else if (typeof inpNodeType === 'string') {
    if (typeof inpNodeId === 'undefined') {
      throw new TypeError('_if needed as well');
    }
    nodeId = inpNodeId;
    nodeType = inpNodeType;
  } else {
    throw TypeError('Incorrect parameters');
  }
  if (nodeType in graph.nodesMaps) {
    const el = graph.nodesMaps[nodeType]!.get(nodeId);
    // @ts-expect-error unable to signal we are the wished for return type
    return el ? (el as unknown as Node) : null;
  }
  return null;
}

export function initGraph<GraphNodes, R extends keyof GraphNodes>(
  rootNode: NodesMaps<GraphNodes>[R] extends Map<Id, infer Node>
    ? Node extends IId<R>
      ? Node
      : never
    : never
): Graph<GraphNodes> {
  const root = rootNode as unknown as IId<R>;
  return {
    rootId: {
      _id: root._id,
      __typename: root.__typename
    },
    nodesMaps: {
      [root.__typename]: new Map([[root._id, root]])
    },
    linksMaps: {

    }
  };
}

export function addNode<
  GraphNodes,
  N extends keyof GraphNodes,
  P extends keyof GraphNodes
>(
  graph: Graph<GraphNodes>,
  parentNode: NodesMaps<GraphNodes>[N] extends Map<Id, infer Node>
    ? Node
    : never,
  node: NodesMaps<GraphNodes>[N] extends Map<Id, infer Node> ? Node : never
): Graph<GraphNodes> {
  return graph;
}
