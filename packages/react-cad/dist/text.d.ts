export declare const TEXT_GLYPHS: Record<string, string[]>;
export declare const SUPPORTED_TEXT_CHARACTERS_DESCRIPTION = "printable Basic Latin / US-ASCII characters U+0020 through U+007E; control characters are unsupported";
export declare function textGlyph(character: string): string[] | undefined;
export declare function unsupportedTextCharacters(value: string): string[];
