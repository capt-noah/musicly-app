declare module 'colorthief' {
  export default class ColorThief {
    static getColor(imageUrl: string | Buffer, quality?: number): Promise<[number, number, number]>;
    static getPalette(imageUrl: string | Buffer, colorCount?: number, quality?: number): Promise<[number, number, number][]>;
    getColor(imageUrl: string | Buffer, quality?: number): Promise<[number, number, number]>;
    getPalette(imageUrl: string | Buffer, colorCount?: number, quality?: number): Promise<[number, number, number][]>;
  }
}
