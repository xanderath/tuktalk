import React from 'react';
import { CommonMechanicView } from './CommonMechanicView';
import { MechanicProps } from './types';

export function RhythmMechanic(props: MechanicProps) {
  return <CommonMechanicView {...props} titlePrefix="Rhythm" accent="#FF6A5F" />;
}
