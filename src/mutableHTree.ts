import {
  AddNodeToTreeChange,
  AllChildrenFields,
  HMutableTree,
  HTree,
  HTreeChange,
  Id,
  IId,
  LinkType,
  NodeDataOfTreeNode,
  NodeLink,
  TreeNode
} from './types';
import {iidToStr} from './utils';
import {createHTree, HTreeImpl} from './htree';
import {treeNodeReducer} from './treeNodeReducer';

interface MutableTreeInternalState<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
> {
  originalTree: HTree<NodesDef, R>;
  currentNodes: Map<string, NodesDef[keyof NodesDef]>;
  summaryChanges: {
    added: Set<string>;
    changed: Set<string>;
    deleted: Set<string>;
  };
}

class HMutableTreeImpl<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
> implements HMutableTree<NodesDef, R>
{
  public readonly _originalTree: HTree<NodesDef, R>;
  private currentNodes: Map<string, NodesDef[keyof NodesDef]>;
  private readonly _changes: HTreeChange<
    NodesDef,
    keyof NodesDef,
    keyof NodesDef
  >[];

  constructor(originalTree: HTree<NodesDef, R>) {
    this._originalTree = originalTree;
    this.currentNodes = new Map(new NodeWithIdIterator(originalTree));
    this._changes = [];
  }

  public get changes() {
    return this._changes;
  }

  public get rootType() {
    return this._originalTree.rootId.__typename;
  }
  public get schema() {
    return this._originalTree.schema;
  }

  public [Symbol.iterator]() {
    return this.currentNodes.values();
  }

  public get originalTree() {
    return this._originalTree;
  }

  public get rootId() {
    return this._originalTree.rootId;
  }

  public emptyNode<NodeType extends keyof NodesDef>(nodeType: NodeType) {
    return this._originalTree.emptyNode(nodeType);
  }

  public get updatedTree(): HTree<NodesDef, R> {
    if (this._changes.length > 0) {
      return new HTreeImpl(this);
    }
    return this._originalTree;
  }

  public getNode<Type extends keyof NodesDef>(
    nodeIId: IId<Type>
  ): NodesDef[Type] | null {
    const strNodeId = iidToStr(nodeIId);
    const node = this.currentNodes.get(strNodeId);
    return node ? (node as NodesDef[Type]) : null;
  }

  public addNode<
    ParentType extends keyof NodesDef,
    Type extends keyof NodesDef
  >(
    parentIId: IId<ParentType>,
    parentPosition:
      | AllChildrenFields<NodesDef[ParentType]>
      | {field: AllChildrenFields<NodesDef[ParentType]>; index: number},
    nodeInfo: {__typename: Type; _id?: Id} & NodeDataOfTreeNode<NodesDef[Type]>
  ): NodesDef[Type] {
    return this._addNode({
      __typename: 'AddNodeToTree',
      parentNodeIId: parentIId,
      parentPosition,
      nodeInfo
    });
  }

  private _addNode<
    TargetTypename extends keyof NodesDef,
    ParentTypename extends keyof NodesDef
  >(
    addNodeChange: AddNodeToTreeChange<NodesDef, TargetTypename, ParentTypename>
  ): NodesDef[TargetTypename] {
    const parentNode = this.getNode(addNodeChange.parentNodeIId);
    if (!parentNode) {
      throw new RangeError('No parent found');
    }
    const parentFieldName =
      typeof addNodeChange.parentPosition === 'object'
        ? addNodeChange.parentPosition.field
        : addNodeChange.parentPosition;
    const parentInIndex =
      typeof addNodeChange.parentPosition === 'object'
        ? addNodeChange.parentPosition.index
        : -1;

    const {_id, __typename, ...other} = addNodeChange.nodeInfo;
    const newNode = this.emptyNode(__typename!);
    if (_id) {
      newNode._id = _id;
    }
    newNode.data = Object.assign(newNode.data, other) as NodeDataOfTreeNode<
      NodesDef[TargetTypename]
    >;
    newNode.parent = {
      __typename: parentNode.__typename,
      _id: parentNode._id,
      parentField: parentFieldName
    };
    if (parentInIndex !== -1) {
      newNode.parent.index = parentInIndex;
    }
    const newNodeId = {_id: newNode._id, __typename: __typename};
    const updatedParent = treeNodeReducer(parentNode, {
      type: 'AddNodeToLinkField',
      nodeId: newNodeId,
      parentField: parentFieldName,
      atIndex: parentInIndex
    });
    if (updatedParent !== parentNode) {
      this.currentNodes.set(iidToStr(parentNode), updatedParent);
    }
    this.currentNodes.set(iidToStr(newNode), newNode);
    this.changes.push({
      __typename: 'AddNodeToTree',
      nodeInfo: Object.assign({}, addNodeChange.nodeInfo, newNodeId),
      parentPosition: addNodeChange.parentPosition,
      parentNodeIId: addNodeChange.parentNodeIId
    });
    return newNode;
  }

  public applyChanges<
    TargetTypename extends keyof NodesDef,
    ParentTypename extends keyof NodesDef
  >(
    inpChanges:
      | HTreeChange<NodesDef, TargetTypename, ParentTypename>
      | HTreeChange<NodesDef, TargetTypename, ParentTypename>[]
  ) {
    const changes = Array.isArray(inpChanges) ? inpChanges : [inpChanges];
    for (const change of changes) {
      if (change.__typename === 'AddNodeToTree') {
        this._addNode(change);
      }
    }
  }
}

class NodeWithIdIterator<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >
> implements IterableIterator<[string, NodesDef[keyof NodesDef]]>
{
  private originalTreeIterator: IterableIterator<NodesDef[keyof NodesDef]>;
  constructor(hTree: HTree<NodesDef>) {
    this.originalTreeIterator = hTree[Symbol.iterator]();
  }

  public [Symbol.iterator]() {
    return this;
  }

  public next(): IteratorResult<[string, NodesDef[keyof NodesDef]]> {
    const nextVal = this.originalTreeIterator.next();
    if (nextVal.done) {
      return {
        done: true,
        value: undefined
      };
    } else {
      return {
        done: false,
        value: [iidToStr(nextVal.value), nextVal.value]
      };
    }
  }
}

export function mutableTree<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
>(tree: HTree<NodesDef, R>): HMutableTree<NodesDef, R> {
  return new HMutableTreeImpl(tree);
}
