export enum LinkType {
  single,
  array,
  set
}

export type Id = number | string;

export interface IIdToStringIdFn<T extends IId<any>> {
  (iid: T): string;
}

export interface IId<T> {
  _id: Id;
  __typename: T;
}

export type TypenameTypeOf<T> = T extends IId<infer S> ? S : never;

export interface SingleLink<LinkedTypename> {
  type: LinkType.single;
  toNodeId: IId<LinkedTypename> | null;
}

export interface LinksArray<LinkedTypename> {
  type: LinkType.array;
  nodesIds: IId<LinkedTypename>[];
}

/**
 * A linksSet represents a parent to multiple children link where
 * the order between links is not important, the existence of it is
 */
export interface LinksSet<LinkedTypename> {
  type: LinkType.set;

  /** For a linksSet we create a string representation of the Id **/
  nodesIds: Map<string, IId<LinkedTypename>>;
}

export type NodeLink<LinkedTypename> =
  | SingleLink<LinkedTypename>
  | LinksSet<LinkedTypename>
  | LinksArray<LinkedTypename>;

export interface ParentToChildLinKField<ParentType, ParentField>
  extends IId<ParentType> {
  parentField: ParentField;
}

export interface TreeNode<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<any, any, any, any, any, any>
  >,
  NodeType extends keyof NodesDef,
  ParentType extends keyof NodesDef,
  NodeData,
  ChildrenFields extends Record<any, NodeLink<keyof NodesDef>>,
  LinksFields extends Record<any, NodeLink<keyof NodesDef>>
> extends IId<NodeType> {
  data: NodeData;
  children: ChildrenFields;
  links?: LinksFields;
  parent: null | ParentToChildLinKField<
    ParentType,
    keyof NodeChildrenOfTreeNode<NodesDef[ParentType]>
  >;
}

export type NodeDataOfTreeNode<NodeDef> = NodeDef extends TreeNode<
  any,
  any,
  any,
  infer NodeData,
  any,
  any
>
  ? NodeData
  : never;

export type NodeChildrenOfTreeNode<NodeDef> = NodeDef extends TreeNode<
  any,
  any,
  any,
  any,
  infer ChildrenFields,
  any
>
  ? ChildrenFields
  : never;

export type NodeLinksOfTreeNode<NodeDef> = NodeDef extends TreeNode<
  any,
  any,
  any,
  any,
  any,
  infer LinksFields
>
  ? LinksFields
  : never;

export interface HTreeSchema<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  RootType extends keyof NodesDef = keyof NodesDef
> {
  nodeTypes: NodesDef;
  rootType: RootType;
}

export type AllChildrenFields<NodeDef> = NodeDef extends TreeNode<
  any,
  any,
  any,
  any,
  infer ChildrenDef,
  any
>
  ? keyof ChildrenDef
  : never;

export interface HTree<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
> {
  readonly schema: HTreeSchema<NodesDef, R>;

  [Symbol.iterator](): IterableIterator<NodesDef[keyof NodesDef]>;

  rootId: IId<R>;

  getNode: <Type extends keyof NodesDef>(
    nodeIId: IId<Type>
  ) => NodesDef[Type] | null;

  emptyNode: <Type extends keyof NodesDef>(
    nodeType: Type,
    nodeId?: Id
  ) => NodesDef[Type];
}

export interface AddNodeToTreeChange<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  ChildTypename extends keyof NodesDef = keyof NodesDef,
  ParentTypename extends keyof NodesDef = keyof NodesDef
> {
  type: 'AddNodeToTree';
  parentNodeIId: IId<ParentTypename>;
  parentPosition:
    | AllChildrenFields<NodesDef[ChildTypename]>
    | {
        field: AllChildrenFields<NodesDef[ChildTypename]>;
        index: number;
      };
  nodeInfo: {__typeName: ChildTypename; _id?: Id} & Partial<
    NodeDataOfTreeNode<NodesDef[ChildTypename]>
  >;
}

export interface ChangeTreeNodeInfoChange<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  ChildTypename extends keyof NodesDef = keyof NodesDef
> {
  type: 'ChangeTreeNodeInfo';
  nodeIId: IId<ChildTypename>;
  dataChanges: Partial<NodeDataOfTreeNode<NodesDef[ChildTypename]>>;
}

export interface DeleteTreeNodeChange<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  ChildTypename extends keyof NodesDef = keyof NodesDef
> {
  type: 'DeleteTreeNode';
  nodeId: IId<ChildTypename>;
}

export interface MoveTreeNodeChange<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  TargetTypename extends keyof NodesDef = keyof NodesDef,
  ParentTypename extends keyof NodesDef = keyof NodesDef
> {
  nodeIId: IId<TargetTypename>;
  parentNodeIId: IId<ParentTypename>;
  parentPosition:
    | AllChildrenFields<NodesDef[ParentTypename]>
    | {
        field: AllChildrenFields<NodesDef[ParentTypename]>;
        index: number;
      };
}

export type HTreeChange<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  TargetTypename extends keyof NodesDef = keyof NodesDef,
  ParentTypename extends keyof NodesDef = keyof NodesDef
> =
  | AddNodeToTreeChange<NodesDef, TargetTypename, ParentTypename>
  | MoveTreeNodeChange<NodesDef, TargetTypename, ParentTypename>
  | DeleteTreeNodeChange<NodesDef, TargetTypename>
  | ChangeTreeNodeInfoChange<NodesDef, TargetTypename>;

/**
 * A mutable version of a HTree document. Allows to track what changes
 * have happened since the tree was initialized with the original document.
 *
 * It's a lazy mutable data structure, we keep as much of the original object
 * references as possible
 *
 * Should all the changes result in the final graph being deep equal to the original
 * one, we will return the original document when asked of the current document.
 */
export interface HMutableTree<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<NodesDef, keyof NodesDef, keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
> extends HTree<NodesDef, R> {
  readonly originalTree: HTree<NodesDef, R>;
  readonly updatedTree: HTree<NodesDef, R>;

  readonly changes: HTreeChange<NodesDef>[];

  applyChanges: <
    TargetTypename extends keyof NodesDef,
    ParentTypename extends keyof NodesDef
  >(
    changes:
      | HTreeChange<NodesDef, TargetTypename, ParentTypename>
      | HTreeChange<NodesDef, TargetTypename, ParentTypename>[]
  ) => void;

  addNode: <ParentType extends keyof NodesDef, Type extends keyof NodesDef>(
    parentNode: IId<ParentType>,
    parentPosition:
      | AllChildrenFields<NodesDef[ParentType]>
      | {field: AllChildrenFields<NodesDef[ParentType]>; index: number},
    nodeInfo: {__typeName: Type; _id?: Id} & NodeDataOfTreeNode<NodesDef[Type]>
  ) => NodesDef[Type];
}
