import React from 'react';
import { CommonMechanicView } from './CommonMechanicView';
import { MechanicProps } from './types';

export function RunnerMechanic(props: MechanicProps) {
  return <CommonMechanicView {...props} titlePrefix="Runner" accent="#FF9C2A" />;
}
