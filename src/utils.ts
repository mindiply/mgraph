import {IId} from "./types";
import {nanoid} from "nanoid";

export function uuid() {
  return nanoid();
}

export function iidToStr(iid: IId<any>): string {
  return `${iid.__typename}.${iid._id}`;
}

export function sameIIds(iid1: IId<any>, iid2: IId<any>) {
  return iid1.__typename === iid2.__typename && iid1._id === iid2._id;
}