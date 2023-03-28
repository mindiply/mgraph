import {HTreeSchema, LinksArray, LinksSet, LinkType, TreeNode} from '../src/types';
import {arrayLinkField, linksSetField} from '../src/links';
import {createHTree, extractSchemaType} from "../src/htree";

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
  TestNodesTypes,
  'RootNode',
  'RootNode',
  RootNodeData,
  {
    contextsIds: LinksSet<'ContextNode' | 'ActivityNode'>;
  },
  {}
>;

type ContextNode = TreeNode<
  TestNodesTypes,
  'ContextNode',
  'RootNode' | 'ContextNode',
  ActivityContextData,
  {activitiesIds: LinksArray<'ContextNode' | 'ActivityNode'>},
  {}
>;

type ActivityNode = TreeNode<
  TestNodesTypes,
  'ActivityNode',
  'ActivityNode' | 'ContextNode',
  ActivityNodeData,
  {activitiesIds: LinksSet<'ActivityNode'>},
  {}
>;
interface TestNodesTypes {
  RootNode: RootNode;
  ContextNode: ContextNode;
  ActivityNode: ActivityNode;
}

const extractedTestSchema = extractSchemaType({
  rootType: 'RootNode',
  nodeTypes: {
    RootNode: {
      __typename: 'RootNode',
      _id: 'testId',
      links: {},
      data: {
        name: '' as string | null,
        description: ''
      },
      children: {
        contextsIds: linksSetField('ContextNode')
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
        activitiesIds: linksSetField('ActivityNode')
      }
    },
    ContextNode: {
      _id: 'test',
      __typename: 'ContextNode',
      children: {
        activitiesIds: arrayLinkField('ContextNode', 'ActivityNode')
      },
      links: {},
      data: {
        name: '',
        isDefault: false
      },
      parent: null
    }
  }
});

const explicitSchema: HTreeSchema<TestNodesTypes, 'RootNode'> = {
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
          type: LinkType.array,
          nodesIds: []
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

describe('Creation of tree and empty nodes', () => {
  describe('Using implicit schema', () => {
    test('Create empty test nodes', () => {
      const tree = createHTree(extractedTestSchema);
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
      emptyActivity.children.activitiesIds.nodesIds.get('aa');
    });
  });

  describe('Using explicit schema', () => {
    test('Create empty test nodes', () => {
      const tree = createHTree(explicitSchema);
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
      emptyActivity.children.activitiesIds.nodesIds.get('aa');
    });
  });
});

// describe('Add contexts and nodes', () => {
//   test('Add Contexts', () => {
//     const tree = createHTree(extractedTestSchema);
//     const newNode = tree.addNode(tree.rootId, 'contextsIds', {
//       __typeName: 'ContextNode',
//       isDefault: false,
//       name: 'Work'
//     });
//     expect(newNode).toEqual(tree.getNode(newNode));
//     expect(newNode).toMatchObject({
//       children: {
//         activitiesIds: {
//           type: LinkType.set,
//           nodesIds: new Map()
//         }
//       },
//       data: {
//         __typeName: 'ContextNode',
//         isDefault: false,
//         name: 'Work'
//       }
//     });
//   });
// });
