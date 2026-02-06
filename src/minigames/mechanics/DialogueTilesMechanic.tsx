import React from 'react';
import { CommonMechanicView } from './CommonMechanicView';
import { MechanicProps } from './types';

export function DialogueTilesMechanic(props: MechanicProps) {
  return <CommonMechanicView {...props} titlePrefix="Dialogue Tiles" accent="#4B5EC9" />;
}
