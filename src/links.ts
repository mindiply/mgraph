import {IId, LinksArray, LinksSet, LinkType, SingleLink} from './types';

export function linksSetField<LinkedToTypes extends string[]>(
  ...types: LinkedToTypes
): LinksSet<LinkedToTypes[number]> {
  return {
    type: LinkType.set,
    nodesIds: new Map<string, IId<LinkedToTypes[number]>>()
  };
}

export function arrayLinkField<LinkedToTypes extends string[]>(
  ...types: LinkedToTypes
): LinksArray<LinkedToTypes[number]> {
  return {
    type: LinkType.array,
    nodesIds: new Array<IId<LinkedToTypes[number]>>()
  };
}

export function singleLinkField<LinkedToTypes extends string[]> (
  ...types: LinkedToTypes
): SingleLink<LinkedToTypes[number]> {
  return {
    type: LinkType.single,
    toNodeId: {
      _id: 'NOACTUALID',
      __typename: types[0]
    }
  }
}
