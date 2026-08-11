export class EscPosBuilder {

  private encoder = new TextEncoder();

  build(
    text: string
  ): Uint8Array {

    return this.encoder.encode(
      text + "\n\n\n"
    );
  }
}