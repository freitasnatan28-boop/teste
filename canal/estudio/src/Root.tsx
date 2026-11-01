import React from "react";
import { CalculateMetadataFunction, Composition, staticFile, Still } from "remotion";
import { Avatar, AvatarEN, Banner, BannerEN, MarcaDaguaEN, ThumbGreenland, ThumbLagosta } from "./Identidade";
import type { Timeline } from "./tipos";
import { Video } from "./Video";

type Props = { timeline: Timeline | null; video: string };

// No Studio, carrega a linha do tempo do vídeo indicado; no render, ela já vem nas props.
const metadados: CalculateMetadataFunction<Props> = async ({ props }) => {
  const timeline = props.timeline ?? ((await (await fetch(staticFile(`videos/${props.video}/timeline.json`))).json()) as Timeline);
  return { durationInFrames: timeline.duracao, fps: timeline.fps, props: { ...props, timeline } };
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={300}
      defaultProps={{ timeline: null, video: "001-guerra-da-lagosta" } as Props}
      calculateMetadata={metadados}
    />
    <Still id="Avatar" component={Avatar} width={800} height={800} />
    <Still id="Banner" component={Banner} width={2560} height={1440} />
    <Still id="Avatar-EN" component={AvatarEN} width={800} height={800} />
    <Still id="Banner-EN" component={BannerEN} width={2560} height={1440} />
    <Still id="MarcaDagua-EN" component={MarcaDaguaEN} width={150} height={150} />
    <Still id="Thumb-002" component={ThumbGreenland} width={1280} height={720} defaultProps={{ pasta: "videos/002-buying-greenland" }} />
    <Still id="Thumb-001" component={ThumbLagosta} width={1280} height={720} defaultProps={{ pasta: "videos/001-guerra-da-lagosta" }} />
  </>
);
