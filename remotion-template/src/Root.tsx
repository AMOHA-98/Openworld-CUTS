import React from 'react';
import {Composition} from 'remotion';
import {Edit} from './Edit';
import settings from '../cuts-settings.json';

export const CutsRoot: React.FC = () => {
  return (
    <Composition
      id="CutsEntry"
      component={Edit}
      durationInFrames={settings.durationSeconds * settings.fps}
      fps={settings.fps}
      width={settings.width}
      height={settings.height}
    />
  );
};
