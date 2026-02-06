export type TapIntentHandler = (intent: string) => void;

export class TapInputAdapter {
  private onIntent: TapIntentHandler;

  constructor(onIntent: TapIntentHandler) {
    this.onIntent = onIntent;
  }

  submit(intent: string) {
    this.onIntent(intent);
  }
}
