import {createHTree, LinkType, mutableTree} from "../src";
import {explicitSchema} from "./testTypes.test";

describe('Adding nodes', () => {
  test('Add a first node', () => {
    const tree = createHTree(explicitSchema);
    const mTree = mutableTree(tree);
    mTree.addNode(tree.rootId, 'contextsIds', {
      __typename: 'ContextNode',
      _id: 'CONTEXT1',
      isDefault: true,
      name: 'Default'
    });
    const updatedTree = mTree.updatedTree;
    expect(updatedTree.getNode({__typename: 'ContextNode', _id: 'CONTEXT1'})).toMatchObject({
      __typename: 'ContextNode',
      _id: 'CONTEXT1',
      data: {
        isDefault: true,
        name: 'Default'
      },
      children: {
        activitiesIds: {
          type: LinkType.array
        }
      }
    });
  });

  test('Adding two nodes', () => {
    const tree = createHTree(explicitSchema);
    const mTree = mutableTree(tree);
    const newContext = mTree.addNode(tree.rootId, 'contextsIds', {
      __typename: 'ContextNode',
      _id: 'CONTEXT1',
      isDefault: true,
      name: 'Default'
    });
    const addedActivity = mTree.addNode(newContext, {field: 'activitiesIds', index: 0}, {
      __typename: 'ActivityNode',
      name: 'Test node',
      progress: 0,
      status: 'active'
    });
    const updatedTree = mTree.updatedTree;
    expect(updatedTree.getNode({__typename: 'ActivityNode', _id: addedActivity._id})).toMatchObject({
      __typename: 'ActivityNode',
      _id: addedActivity._id,
      data: {
        name: 'Test node',
        progress: 0,
        status: 'active'
      },
      children: {
        activitiesIds: {
          type: LinkType.set
        }
      }
    });
  });
});
