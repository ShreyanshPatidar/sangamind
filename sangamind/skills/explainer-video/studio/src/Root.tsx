import {Composition} from "remotion";
import {calculateExplainerMetadata, Explainer} from "./Explainer";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Explainer"
        component={Explainer}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{video: "14"}}
        calculateMetadata={calculateExplainerMetadata}
      />
    </>
  );
};
