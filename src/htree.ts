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
  ParentToChildLinkField,
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
  return Boolean(
    val &&
    typeof val === 'object' &&
    val.schema &&
    val.rootId &&
    typeof val.getNode === 'function' &&
    typeof val.emptyNode === 'function'
  );
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
