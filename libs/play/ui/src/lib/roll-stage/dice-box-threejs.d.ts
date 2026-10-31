/** The slice of `@3d-dice/dice-box-threejs` the roll stage uses; the package ships no types. */
declare module '@3d-dice/dice-box-threejs' {
  /** A custom dice colour set; `texture: 'none'` needs no image files. */
  interface DiceColorSet {
    readonly name: string;
    readonly foreground: string;
    readonly background: string;
    readonly outline: string;
    readonly texture: string;
    readonly material: string;
  }

  interface DiceBoxConfig {
    readonly sounds?: boolean;
    readonly shadows?: boolean;
    readonly theme_customColorset?: DiceColorSet | null;
    readonly theme_material?: string;
    readonly gravity_multiplier?: number;
    readonly strength?: number;
    readonly baseScale?: number;
  }

  interface DiceBoxRenderer {
    readonly domElement: HTMLCanvasElement;
    readonly dispose: () => void;
    readonly forceContextLoss: () => void;
  }

  export default class DiceBox {
    public constructor(selector: string, config?: DiceBoxConfig);
    public readonly renderer: DiceBoxRenderer;
    public initialize(): Promise<void>;
    public updateConfig(config: DiceBoxConfig): Promise<void>;
    /** Rolls dice notation such as `2d10@1,10`, landing on the faces after the `@`. */
    public roll(notation: string): Promise<unknown>;
    /** Throws more dice beside the ones on the table. */
    public add(notation: string): Promise<unknown>;
    public clearDice(): void;
  }
}
