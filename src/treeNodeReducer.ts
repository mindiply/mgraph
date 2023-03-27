import {IId, LinkType, NodeLink, TreeNode} from "./types";
import {iidToStr, sameIIds} from "./utils";

interface AddNodeToLinkFieldAction<ParentField, ToNodeType> {
  type: 'AddNodeToLinkField';
  parentField: ParentField;
  nodeId: IId<ToNodeType>;
  atIndex?: number;
}

interface RemoveNodeFromLinkFieldAction<ParentField, NodeType> {
  type: 'RemoveNodeFromLinkField';
  parentField: ParentField;
  nodeId: IId<NodeType>;
}

interface MoveNodeInLinkFieldAction<ParentField, NodeType> {
  type: 'MoveNodeInLinkField';
  parentField: ParentField;
  nodeId: IId<NodeType>;
  toIndex: number;
}

type LinkFieldAction<ParentField, NodeType> =
  | AddNodeToLinkFieldAction<ParentField, NodeType>
  | RemoveNodeFromLinkFieldAction<ParentField, NodeType>
  | MoveNodeInLinkFieldAction<ParentField, NodeType>;

function nodeLinkReducer<T>(
  state: NodeLink<IId<T>>,
  action: LinkFieldAction<any, T>
): NodeLink<IId<T>> {
  if (!(action && action.type)) {
    return state;
  }
  if (state.type === LinkType.set) {
    if (action.type === 'AddNodeToLinkField') {
      const nodeIId = iidToStr(action.nodeId);
      if (state.nodesIds.has(nodeIId)) {
        return state;
      }
      const newNodesIds = new Map(state.nodesIds);
      newNodesIds.set(nodeIId, action.nodeId);
      return {...state, nodesIds: newNodesIds};
    } else if (action.type === 'MoveNodeInLinkField') {
      const nodeIId = iidToStr(action.nodeId);
      if (!state.nodesIds.has(nodeIId)) {
        return state;
      }
      const newNodesIds = new Map(state.nodesIds);
      newNodesIds.delete(nodeIId);
      return {...state, nodesIds: newNodesIds};
    }
  } else if (state.type === LinkType.array) {
    if (action.type === 'AddNodeToLinkField') {
      if (
        state.nodesIds.findIndex(
          existingIId =>
            existingIId.__typename === action.nodeId.__typename &&
            existingIId._id === action.nodeId._id
        ) !== -1
      ) {
        return state;
      }
      const atIndex = action.atIndex ? action.atIndex : state.nodesIds.length;
      if (atIndex < 0 || atIndex > state.nodesIds.length) {
        throw new RangeError('Incorrect index for insertion');
      }
      const newState = Object.assign({}, state, {
        nodesIds: state.nodesIds.slice()
      });
      if (atIndex === newState.nodesIds.length) {
        newState.nodesIds.push(action.nodeId);
      } else {
        newState.nodesIds.splice(atIndex, 0, action.nodeId);
      }
      return newState;
    } else if (action.type === 'MoveNodeInLinkField') {
      if (action.toIndex < 0 || action.toIndex > state.nodesIds.length) {
        throw new RangeError('Incorrect target index to move node to');
      }
      const currentIndex = state.nodesIds.findIndex(nodeIId =>
        sameIIds(nodeIId, action.nodeId)
      );
      if (currentIndex === -1) {
        throw new TypeError('Requested node to move not found');
      }
      let newState = state;
      if (currentIndex !== action.toIndex) {
        newState = Object.assign({}, state);
        newState.nodesIds = newState.nodesIds.slice();
        newState.nodesIds.splice(action.toIndex, 0, action.nodeId);
      }
      return newState;
    } else if (action.type === 'RemoveNodeFromLinkField') {
      const currentIndex = state.nodesIds.findIndex(nodeIId =>
        sameIIds(nodeIId, action.nodeId)
      );
      if (currentIndex === -1) {
        // We don't throw an error because the end state is what we would have wished for
        return state;
      }
      const newState = Object.assign({}, state, {
        nodeIds: state.nodesIds.slice()
      });
      newState.nodesIds.splice(currentIndex, 1);
      return newState;
    }
  } else if (state.type === LinkType.single) {
    if (action.type === 'AddNodeToLinkField') {
      if (state.toNodeId && sameIIds(action.nodeId, state.toNodeId)) {
        return state;
      } else {
        return Object.assign({}, state, {toNodeId: action.nodeId});
      }
    } else if (action.type === 'RemoveNodeFromLinkField') {
      if (state.toNodeId) {
        return Object.assign({}, state, {toNodeId: null});
      } else {
        return state;
      }
    }
  }
  return state;
}

function nodeChildrenReducer<
  T extends IId<any>,
  ChildrenDef extends Record<any, NodeLink<T>>,
  K extends keyof ChildrenDef
>(state: ChildrenDef, action: LinkFieldAction<K, T>): ChildrenDef {
  if (!(action && action.type)) {
    return state;
  }
  if (!(action.parentField in state)) {
    throw new TypeError('Requested link field not present');
  }
  const linkField = state[action.parentField] as NodeLink<T>;
  const updatedLinkField = nodeLinkReducer(linkField, action);
  if (updatedLinkField !== linkField) {
    return Object.assign({}, state, {[action.parentField]: updatedLinkField});
  }
  return state;
}


type TreeNodeAction = LinkFieldAction<any, any>;
function treeNodeReducer<
  NodeType,
  NodeData,
  ChildrenFields extends Record<any, NodeLink<any>>,
  LinksFields extends Record<any, NodeLink<any>>
>(
  state: TreeNode<NodeType, NodeData, ChildrenFields, LinksFields>,
  action: TreeNodeAction
): TreeNode<NodeType, NodeData, ChildrenFields, LinksFields> {
  if (!(action && action.type)) {
    return state;
  }
  const updatedChildren = nodeChildrenReducer(state.children, action);
  if (updatedChildren !== state.children) {
    return Object.assign({}, state, {children: updatedChildren});
  }
  return state;
}
