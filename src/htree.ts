import {
  AllChildrenFields,
  HTree,
  HTreeSchema,
  Id,
  IId,
  LinkType,
  NodeChildrenOfTreeNode,
  NodeDataOfTreeNode,
  NodeLink,
  NodeLinksOfTreeNode,
  ParentToChildLinKField,
  TreeNode
} from './types';
import {iidToStr, uuid} from './utils';

function isHTree<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
>(val: any): val is HTree<NodesDef, R> {
  return val && val instanceof HTreeImpl;
}

function isNodeKeyStrIterator<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >
>(val: any): val is IterableIterator<[string, NodesDef[keyof NodesDef]]> {
  return val && typeof val === 'object' && val.next;
}

type ChildrenMapOfTreeNodes<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >
> = {
  [NodeType in keyof NodesDef]: NodesDef[NodeType] extends TreeNode<
    NodesDef,
    keyof NodesDef,
    keyof NodesDef,
    any,
    infer ChildrenDef,
    any
  >
    ? ChildrenDef
    : never;
};

type LinkMapOfTreeNodes<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >
> = {
  [NodeType in keyof NodesDef]: NodesDef[NodeType] extends TreeNode<
    NodesDef,
    keyof NodesDef,
    keyof NodesDef,
    any,
    infer ChildrenDef,
    any
  >
    ? ChildrenDef
    : never;
};

export class HTreeImpl<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<
      NodesDef,
      keyof NodesDef,
      keyof NodesDef,
      NodeDataOfTreeNode<NodesDef[keyof NodesDef]>,
      ChildrenMapOfTreeNodes<NodesDef>[keyof NodesDef],
      LinkMapOfTreeNodes<NodesDef>[keyof NodesDef]
    >
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
    const newNode = {
      _id: uuid(),
      __typename: nodeType,
      children: Object.assign(
        {},
        nodeTypeDef.children
      ) as NodeChildrenOfTreeNode<NodesDef[NodeType]>,
      data: Object.assign({}, nodeTypeDef.data) as NodeDataOfTreeNode<
        NodesDef[NodeType]
      >,
      links: Object.assign({}, nodeTypeDef.links) as NodeLinksOfTreeNode<
        NodesDef[NodeType]
      >,
      parent: null
    };
    return newNode as unknown as NodesDef[NodeType];
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
    nodeInfo: {__typename: Type; _id?: Id} & NodeDataOfTreeNode<NodesDef[Type]>
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
    const newNode = this.emptyNode(nodeInfo.__typename);
    // @ts-expect-error Unknown field without resolving the interface
    newNode.data = Object.assign(newNode.data, other) as NodeDataOfTreeNode<
      NodesDef[Type]
    >;
    newNode.parent = {
      __typename: parentNode.__typename,
      _id: parentNode._id,
      parentField: parentFieldName
    };
    const newNodeId = {_id: newNode._id, __typename: __typename};
    const newParent = Object.assign({}, parent, {
      children: Object.assign({}, parent.children)
    });
    const parentField = Object.assign(
      {},
      parent.children[parentFieldName]
    ) as unknown as NodeLink<Type>;
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
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
>(schema: HTreeSchema<NodesDef, R>): HTree<NodesDef, R> {
  return new HTreeImpl(schema);
}

/**
 * Function that returns the schema like object passed as parameter, useful
 * to extract a schema from a tree schema rather than writing the schema beforehand.
 *
 * @param schema The schema you want to extract type information from
 */
export function extractSchemaType<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<
      NodesDef,
      keyof NodesDef,
      keyof NodesDef,
      NodeDataOfTreeNode<NodesDef[keyof NodesDef]>,
      Record<any, NodeLink<keyof NodesDef>>,
      any
    >
  >,
  RootType extends keyof NodesDef = keyof NodesDef
>(schema: HTreeSchema<NodesDef, RootType>): HTreeSchema<NodesDef, RootType> {
  return schema;
}
