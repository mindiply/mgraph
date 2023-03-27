import {
  AddNodeToTreeAction,
  HTree,
  HTreeSchema,
  LinksSet,
  LinkType,
  TreeNode
} from '../src/types';
import {addNodeToTreeAction, createHTree} from '../src';

interface RootNodeData {
  name: string;
  description: string;
}

interface ActivityContextData {
  name: string;
  isDefault: boolean;
}

interface ActivityNodeData {
  name: string;
  progress: number;
  status: 'active' | 'snoozed' | 'done';
}

type RootNode = TreeNode<
  'RootNode',
  RootNodeData,
  {
    contextsIds: LinksSet<ContextNode | ActivityNode>;
  },
  {}
>;

type ContextNode = TreeNode<
  'ContextNode',
  ActivityContextData,
  {activitiesIds: LinksSet<ContextNode | ActivityNode>},
  {}
>;

type ActivityNode = TreeNode<
  'ActivityNode',
  ActivityNodeData,
  {activitiesIds: LinksSet<ActivityNode>},
  {}
>;
interface TestNodesTypes {
  RootNode: RootNode;
  ContextNode: ContextNode;
  ActivityNode: ActivityNode;
}

const testSchema: HTreeSchema<TestNodesTypes, 'RootNode'> = {
  rootType: 'RootNode',
  nodeTypes: {
    RootNode: {
      __typename: 'RootNode',
      _id: 'testId',
      links: {},
      data: {
        name: '',
        description: ''
      },
      children: {
        contextsIds: {
          type: LinkType.set,
          nodesIds: new Map()
        }
      },
      parent: null
    },
    ActivityNode: {
      parent: null,
      data: {
        name: '',
        status: 'active',
        progress: 0
      },
      links: {},
      _id: 'test',
      __typename: 'ActivityNode',
      children: {
        activitiesIds: {
          nodesIds: new Map(),
          type: LinkType.set
        }
      }
    },
    ContextNode: {
      _id: 'test',
      __typename: 'ContextNode',
      children: {
        activitiesIds: {
          type: LinkType.set,
          nodesIds: new Map()
        }
      },
      links: {},
      data: {
        name: '',
        isDefault: false
      },
      parent: null
    }
  }
};

const addAction = addNodeToTreeAction<ContextNode, ActivityNode>(
  {_id: 1, __typename: 'ContextNode'},
  'activitiesIds',
  {__typeName: 'ActivityNode', name: 'hello', status: 'active'}
);

describe('Creation of tree and empty nodes', () => {
  test('Create empty test nodes', () => {
    const tree = createHTree(testSchema);
    const emptyRoot = tree.emptyNode('RootNode');
    const emptyContext = tree.emptyNode('ContextNode');
    const emptyActivity = tree.emptyNode('ActivityNode');
    expect(emptyRoot.data).toMatchObject({
      name: '',
      description: ''
    });
    expect(emptyContext.data).toMatchObject({
      name: '',
      isDefault: false
    });
    expect(emptyActivity.data).toMatchObject({
      name: '',
      status: 'active',
      progress: 0
    });
  });

  describe('Add contexts and nodes', () => {
    test('Add Contexts', () => {
      const tree = createHTree(testSchema);
      const newNode = tree.addNode(tree.rootId, 'contextsIds', {
        __typeName: 'ContextNode',
        isDefault: false,
        name: 'Work'
      });
      expect(newNode).toEqual(tree.getNode(newNode));
      expect(newNode).toMatchObject({
        children: {
          activitiesIds: {
            type: LinkType.set,
            nodesIds: new Map()
          }
        },
        data: {
          __typeName: 'ContextNode',
          isDefault: false,
          name: 'Work'
        }
      });
    });
  });
});
