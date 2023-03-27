import {
  AddNodeToTreeAction,
  AllChildrenFields,
  HMutableTree,
  HTree,
  HTreeSchema,
  Id,
  IId,
  LinkType,
  NodeDataOfTreeNode,
  NodeLink,
  TreeNode,
  TypenameTypeOf
} from './types';
import {iidToStr, uuid} from './utils';
import {LazyMutableMap} from './lazyMap';

function isHTree<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
>(val: any): val is HTree<NodesDef, R> {
  return val && val instanceof HTreeImpl;
}

class HTreeImpl<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
> implements HTree<NodesDef, R>
{
  public readonly schema: HTreeSchema<NodesDef, R>;
  protected nodes: Map<string, NodesDef[keyof NodesDef]>;

  public rootId: IId<R>;

  constructor(schemaOrTree: HTreeSchema<NodesDef, R> | HTree<NodesDef, R>) {
    if (isHTree<NodesDef, R>(schemaOrTree)) {
      const treeNodes = Array.from(schemaOrTree[Symbol.iterator]());
      this.nodes = new Map(
        treeNodes.map(treeNode => [iidToStr(treeNode), treeNode])
      );
      this.schema = schemaOrTree.schema;
      this.rootId = Object.assign({}, schemaOrTree.rootId);
    } else {
      this.schema = schemaOrTree;
      this.nodes = new Map();
      const root = this.emptyNode(schemaOrTree.rootType);
      this.rootId = root as unknown as IId<R>;
      this.nodes.set(iidToStr(this.rootId), root);
    }
  }

  public [Symbol.iterator](): IterableIterator<NodesDef[keyof NodesDef]> {
    return this.nodes.values();
  }

  public emptyNode<NodeType extends keyof NodesDef>(nodeType: NodeType) {
    const schema = this.schema;
    const nodeTypeDef = schema.nodeTypes[nodeType];
    return {
      _id: uuid(),
      __typename: nodeType,
      children: Object.assign({}, nodeTypeDef.children),
      data: Object.assign({}, nodeTypeDef.data),
      links: Object.assign({}, nodeTypeDef.links),
      parent: null
    } as unknown as NodesDef[NodeType];
  }

  public getNode<Type extends keyof NodesDef>(
    nodeIId: IId<Type>
  ): NodesDef[Type] | null {
    return (
      (this.nodes.get(iidToStr(nodeIId)) as NodesDef[Type] | undefined) || null
    );
  }

  public addNode<
    ParentType extends keyof NodesDef,
    Type extends keyof NodesDef
  >(
    parentNode: IId<ParentType>,
    parentPosition:
      | AllChildrenFields<NodesDef[ParentType]>
      | {field: AllChildrenFields<NodesDef[ParentType]>; index: number},
    nodeInfo: {__typeName: Type; _id?: Id} & NodeDataOfTreeNode<NodesDef[Type]>
  ): NodesDef[Type] {
    const parent = this.getNode(parentNode);
    if (!parent) {
      throw new RangeError('No parent found');
    }
    const parentFieldName =
      typeof parentPosition === 'object'
        ? parentPosition.field
        : parentPosition;
    const parentInIndex =
      typeof parentPosition === 'object' ? parentPosition.index : -1;

    const {_id, __typename, ...other} = nodeInfo;
    const emptyNewNode = this.emptyNode(nodeInfo.__typeName);
    const newNode = Object.assign(emptyNewNode, {
      data: Object.assign(emptyNewNode.data, other),
      parent: {__typename: parent.__typename, _id: parent._id}
    });
    const newNodeId = {_id: newNode._id, __typename: __typename};
    const newParent = Object.assign({}, parent, {
      children: Object.assign({}, parent.children)
    });
    const parentField = Object.assign(
      {},
      parent.children[parentFieldName]
    ) as NodeLink<IId<Type>>;
    if (parentField.type === LinkType.array) {
      if (parentInIndex < 0 || parentInIndex > parentField.nodesIds.length) {
        throw new RangeError('Unexpected position in array');
      }
      parentField.nodesIds = parentField.nodesIds.slice();
      if (parentInIndex === parentField.nodesIds.length) {
        parentField.nodesIds.push(newNodeId);
      } else if (parentInIndex === 0) {
        parentField.nodesIds.unshift(newNodeId);
      } else {
        parentField.nodesIds.splice(parentInIndex, 0, newNodeId);
      }
    } else if (parentField.type === LinkType.set) {
      parentField.nodesIds.set(iidToStr(newNodeId), newNodeId);
    } else if (parentField.type === LinkType.single) {
      parentField.toNodeId = newNodeId;
    } else {
      throw new TypeError('Incorrect link type detected');
    }
    this.nodes.set(iidToStr(newNode), newNode);
    return newNode;
  }
}

export function createHTree<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
>(schema: HTreeSchema<NodesDef, R>): HTree<NodesDef, R> {
  return new HTreeImpl(schema);
}

class HMutableTreeImpl<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
> implements HMutableTree<NodesDef, R>
{
  private mutableNodes: LazyMutableMap<string, NodesDef[keyof NodesDef]>;
  public readonly originalTree: HTree<NodesDef, R>;

  constructor(originalTree: HTree<NodesDef, R>) {
    this.originalTree = originalTree;
    this.mutableNodes = new LazyMutableMap<string, NodesDef[keyof NodesDef]>(
      new Map(
        Array.from(originalTree[Symbol.iterator]()).map(node => [
          iidToStr(node),
          node
        ])
      )
    );
  }
}
