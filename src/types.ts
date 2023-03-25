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

export interface SingleLink<P, C> {
  type: LinkType.single;
  leftNodeId: IId<TypenameTypeOf<P>>;
  rightNodeId: IId<TypenameTypeOf<C>>;
}

export interface LinksArray<P extends IId<any>, C extends IId<any>> {
  type: LinkType.array;
  parentNodeId: IId<TypenameTypeOf<P>>;
  nodeIds: IId<TypenameTypeOf<C>>[];
}

/**
 * A linksset represents a parent to multiple children link where
 * the order between links is not important, the existence of it is
 */
export interface LinksSet<P extends IId<any>, C extends IId<any>> {
  type: LinkType.set;
  parentNodeId: IId<TypenameTypeOf<P>>;

  /** For a linksSet we create a string representation of the Id **/
  nodesIds: Map<string, IId<TypenameTypeOf<C>>>;
}

export type NodeLink<P extends IId<any>, C extends IId<any>> =
  | SingleLink<P, C>
  | LinksSet<P, C>
  | LinksArray<P, C>;

export type GraphNode<
  Node extends IId<any>,
  ChildrenDef extends Record<any, NodeLink<Node, any>>,
  Links extends Record<any, NodeLink<Node, any>>
> = {
  node: Node;
  children: ChildrenDef;
  links?: Links;
};

export type NodesMaps<Nodes> = {
  [F in keyof Nodes]?: Nodes[F] extends GraphNode<infer Node, any, any>
    ? Node extends IId<F>
      ? Map<Id, Node>
      : never
    : never;
};

export type NodesChildrenMaps<GraphNodes> = {
  [F in keyof GraphNodes]: GraphNodes[F] extends GraphNode<
    infer Node,
    infer ChildrenDef,
    any
  >
    ? ChildrenDef extends Record<any, NodeLink<Node, any>>
      ? {[C in keyof ChildrenDef]: Map<Id, ChildrenDef[C]>}
      : never
    : never;
};

export type Graph<GraphNodes> = {
  nodesMaps: NodesMaps<GraphNodes>;
  linksMaps: NodesChildrenMaps<GraphNodes>;
  rootId: IId<keyof GraphNodes>;
};

type ValueOf<T> = T[keyof T];
export type AllGraphNodes<G> = G extends Graph<infer GraphNodes>
  ? ValueOf<NodesMaps<GraphNodes>>
  : never;
