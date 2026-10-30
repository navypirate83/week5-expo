import { Image } from 'expo-image';
import { Platform } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { useSymbols } from '@/context/symbols-context';

// Text that can contain mana and game symbols written in braces, such as {2}{W} or {T}.
// It shows the normal text as text, and replaces each symbol with Scryfall's picture of it.
//
//   <RichText>{"{2}{W}: Draw a card."}</RichText>
//   <RichText size={24}>{"{4}{W}{U}{B}{R}{G}"}</RichText>   // bigger symbols for the mana cost
//
// Anything in braces that Scryfall doesn't have a picture for stays as plain text, and
// until the symbol table has loaded, everything shows as plain text.

// Cuts the text into pieces at every {symbol}. The brackets in the pattern are what keep the
// symbols in the result: "Pay {2}{W}" becomes ["Pay ", "{2}", "", "{W}", ""].
const SYMBOL_SPLITTER = /(\{[^{}]+\})/g;

export function RichText({
  children,
  size = 18,
  ...textProps
}: ThemedTextProps & { children: string; size?: number }) {
  const symbols = useSymbols();

  return (
    <ThemedText {...textProps}>
      {children.split(SYMBOL_SPLITTER).map((piece, index) => {
        // Capital letters in the table ("{W}"), so "{w}" still finds its picture.
        const symbol = symbols[piece.toUpperCase()];
        if (!symbol) return piece; // ordinary text, or a symbol we have no picture for

        return (
          <Image
            key={index}
            source={{ uri: symbol.imageUrl }}
            // Keep downloaded symbols on the phone so they also show offline.
            cachePolicy="disk"
            accessibilityLabel={symbol.description}
            style={[
              { width: size, height: size },
              // On the web, make the picture sit in the line of text instead of breaking it.
              Platform.OS === 'web' ? ({ display: 'inline-block', verticalAlign: 'text-bottom' } as object) : null,
            ]}
          />
        );
      })}
    </ThemedText>
  );
}
