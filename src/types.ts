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

export interface SingleLink<C extends IId<any>> {
  type: LinkType.single;
  toNodeId: IId<TypenameTypeOf<C>> | null;
}

export interface LinksArray<C extends IId<any>> {
  type: LinkType.array;
  nodesIds: IId<TypenameTypeOf<C>>[];
}

/**
 * A linksSet represents a parent to multiple children link where
 * the order between links is not important, the existence of it is
 */
export interface LinksSet<C extends IId<any>> {
  type: LinkType.set;

  /** For a linksSet we create a string representation of the Id **/
  nodesIds: Map<string, IId<TypenameTypeOf<C>>>;
}

export type NodeLink<C extends IId<any>> =
  | SingleLink<C>
  | LinksSet<C>
  | LinksArray<C>;

export interface TreeNode<
  NodeType,
  NodeData,
  ChildrenFields extends Record<any, NodeLink<any>>,
  LinksFields extends Record<any, NodeLink<any>>
> extends IId<NodeType> {
  data: NodeData;
  children: ChildrenFields;
  links?: LinksFields;
  parent: null | IId<any>;
}

export type NodeDataOfTreeNode<NodeDef> = NodeDef extends TreeNode<
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
  infer ChildrenFields,
  any
>
  ? ChildrenFields
  : never;

export type NodeLinksOfTreeNode<NodeDef> = NodeDef extends TreeNode<
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
    TreeNode<keyof NodesDef, any, any, any>
  >,
  RootType extends keyof NodesDef = keyof NodesDef
> {
  nodeTypes: NodesDef;
  rootType: RootType;
}

export type AllChildrenFields<NodeDef> = NodeDef extends TreeNode<
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
    TreeNode<keyof NodesDef, any, any, any>
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

export interface AddNodeToTreeAction<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
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

export interface ChangeTreeNodeInfoAction<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
  >,
  ChildTypename extends keyof NodesDef = keyof NodesDef
> {
  type: 'ChangeTreeNodeInfo';
  nodeIId: IId<ChildTypename>;
  dataChanges: Partial<NodeDataOfTreeNode<NodesDef[ChildTypename]>>;
}

export interface DeleteTreeNodeAction<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
  >,
  ChildTypename extends keyof NodesDef = keyof NodesDef
> {
  type: 'DeleteTreeNode';
  nodeId: IId<ChildTypename>;
}

export interface MoveTreeNodeAction<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
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
    TreeNode<keyof NodesDef, any, any, any>
  >,
  TargetTypename extends keyof NodesDef = keyof NodesDef,
  ParentTypename extends keyof NodesDef = keyof NodesDef
> =
  | AddNodeToTreeAction<NodesDef, TargetTypename, ParentTypename>
  | MoveTreeNodeAction<NodesDef, TargetTypename, ParentTypename>
  | DeleteTreeNodeAction<NodesDef, TargetTypename>
  | ChangeTreeNodeInfoAction<NodesDef, TargetTypename>;

export interface HMutableTree<
  NodesDef extends Record<
    keyof NodesDef,
    TreeNode<keyof NodesDef, any, any, any>
  >,
  R extends keyof NodesDef = keyof NodesDef
> extends HTree<NodesDef, R> {
  readonly originalTree: HTree<NodesDef, R>;
  readonly updatedTree: HTree<NodesDef, R>;

  readonly changes: HTreeChange<NodesDef>;

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
