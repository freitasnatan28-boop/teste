import React from 'react';
import {Composition} from 'remotion';
import './fontes';
import {Anuncio} from './Anuncio';
import T from './timeline.json';

// Três saídas a partir da mesma linha do tempo (work/config.json -> preparar.py -> timeline.json).
export const Root = () => (
  <>
    <Composition id="anuncio-9x16" component={Anuncio} width={1080} height={1920} fps={T.fps}
      durationInFrames={T.dur} defaultProps={{layout: '9x16', legendas: true}} />
    <Composition id="anuncio-4x5" component={Anuncio} width={1080} height={1350} fps={T.fps}
      durationInFrames={T.dur} defaultProps={{layout: '4x5', legendas: true}} />
    <Composition id="anuncio-9x16-sem-legenda" component={Anuncio} width={1080} height={1920} fps={T.fps}
      durationInFrames={T.dur} defaultProps={{layout: '9x16', legendas: false}} />
  </>
);
