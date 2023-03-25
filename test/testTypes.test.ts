import {
  Graph,
  IId,
  LinksSet,
  LinkType
} from '../src/types';
import {getNode} from "../src";

interface RootNode extends IId<'RootNode'> {
  name: string;
  description: string;
}

interface ActivityContext extends IId<'ActivityContext'> {
  name: string;
  isDefault: boolean;
}

interface ActivityNode extends IId<'ActivityNode'> {
  name: string;
  progress: number;
  status: 'active' | 'snoozed' | 'done';
}

interface TestNodesTypes {
  RootNode: {
    node: RootNode;
    children: {
      contextsIds: LinksSet<RootNode, ActivityContext | ActivityNode>;
    };
    links: {};
  };
  ActivityContext: {
    node: ActivityContext;
    children: {activitiesIds: LinksSet<ActivityContext, ActivityNode>};
    links: {};
  };
  ActivityNode: {
    node: ActivityNode;
    children: {activitiesIds: LinksSet<ActivityNode, ActivityNode>};
    links: {};
  };
}

type TestGraph = Graph<TestNodesTypes>;

function emptyTestGraph(): TestGraph {
  return {
    linksMaps: {
      ActivityContext: {activitiesIds: new Map()},
      ActivityNode: {activitiesIds: new Map()},
      RootNode: {contextsIds: new Map()}
    },
    nodesMaps: {
      RootNode: new Map([[1, {
        _id: 1,
        __typename: 'RootNode',
        name: '',
        description: ''
      }]]),
      ActivityNode: new Map(),
      ActivityContext: new Map()
    },
    rootId: {
      _id: 1,
      __typename: 'RootNode'
    }
  }
}

let t = emptyTestGraph();

const activitiesNodes = t.nodesMaps.ActivityNode;
const activitiesLinks = t.linksMaps.ActivityNode;
const nContext = activitiesLinks.activitiesIds.set(1, {
  type: LinkType.set,
  nodesIds: new Map([['ActivityNode.2', {_id: 2, __typename: 'ActivityNode'}], ['ActivityNode.3', {_id: 3, __typename: 'ActivityNode'}]]),
  parentNodeId: {
    _id: 1,
    __typename: 'ActivityNode'
  }
});

const activity = getNode(t, 'ActivityNode', 1);
const root = getNode(t, t.rootId);

const activityContext = t.linksMaps.RootNode.contextsIds.get(1)