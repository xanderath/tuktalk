import React from 'react';
import { CommonMechanicView } from './CommonMechanicView';
import { MechanicProps } from './types';

export function SortMatchMechanic(props: MechanicProps) {
  return <CommonMechanicView {...props} titlePrefix="Sort & Match" accent="#2455B8" />;
}
