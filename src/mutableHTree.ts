import {HMutableTree, HTree, HTreeChange, IId, TreeNode} from './types';
import {iidToStr} from './utils';

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
  }
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
  private _changes: HTreeChange<NodesDef, keyof NodesDef, keyof NodesDef>[];

  constructor(originalTree: HTree<NodesDef, R>) {
    this._originalTree = originalTree;
    this.currentNodes = new Map(new NodeWithIdIterator(originalTree));
    this._changes = [];
  }

  public get changes() {
    return this._changes;
  }

  public [Symbol.iterator]() {
    return this.currentNodes.values();
  }

  public get originalTree() {
    return this._originalTree;
  }

  public get updatedTree() {

  }

  public getNode<Type extends keyof NodesDef>(
    nodeIId: IId<Type>
  ): NodesDef[Type] | null {
    const strNodeId = iidToStr(nodeIId);
    const node = this.currentNodes.get(strNodeId);
    return node ? (node as NodesDef[Type]) : null;
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
