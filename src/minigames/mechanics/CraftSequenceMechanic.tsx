import React from 'react';
import { CommonMechanicView } from './CommonMechanicView';
import { MechanicProps } from './types';

export function CraftSequenceMechanic(props: MechanicProps) {
  return <CommonMechanicView {...props} titlePrefix="Craft Sequence" accent="#2ACF9C" />;
}
