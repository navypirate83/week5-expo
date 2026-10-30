import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// This file has the two pieces of the card search:
//   CardSearchBox   - the text field at the top of the Card Rulings page
//   CardSuggestions - the floating list of matching names that drops down from it
// They are separate so the page can place the list ON TOP of the card below it,
// like a real dropdown, instead of pushing the card down the page.

// THE TEXT FIELD. The page gives it:
//   query       - the text currently in the box
//   firstMatch  - the best matching name (Enter picks this one), or undefined
//   onChangeQuery(text) - called on every keystroke
//   onSelect(name)      - called when a name is chosen
export function CardSearchBox({
  query,
  firstMatch,
  disabled,
  onChangeQuery,
  onSelect,
}: {
  query: string;
  firstMatch: string | undefined;
  disabled: boolean;
  onChangeQuery: (text: string) => void;
  onSelect: (name: string) => void;
}) {
  const theme = useTheme();

  return (
    // The rounded bar holding the text field and the clear (x) button.
    <ThemedView type="backgroundElement" style={styles.inputRow}>
      <TextInput
        value={query}
        onChangeText={onChangeQuery}
        // Pressing Enter / Search on the keyboard picks the best match (the first one).
        onSubmitEditing={() => firstMatch && onSelect(firstMatch)}
        placeholder="Search for a card..."
        placeholderTextColor={theme.textSecondary}
        // Card names aren't regular words, so don't let the phone "fix" what you type.
        autoCorrect={false}
        autoCapitalize="none"
        spellCheck={false}
        returnKeyType="search"
        editable={!disabled}
        accessibilityLabel="Search for a card"
        style={[styles.input, { color: theme.text }]}
      />
      {query.length > 0 && (
        <Pressable
          onPress={() => onChangeQuery('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}>
          <ThemedText themeColor="textSecondary">✕</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

// Every row in the list is exactly this tall. Knowing the height lets the list work out
// where row number 5,000 is without having to measure the 4,999 rows above it.
const ROW_HEIGHT = 40;

// THE FLOATING LIST of ALL matching names, best match first. The page positions this on top
// of the content below the search box. Tapping a name calls onSelect.
//
// There can be thousands of matches (typing just "a" matches most of the 35,000 cards), so
// the list is scrollable and only draws the rows you can currently see, plus a few extra
// either side. That is what FlatList does, and it keeps the page fast.
export function CardSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (name: string) => void;
}) {
  const theme = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  // Lets us scroll the list from code.
  const listRef = useRef<FlatList<string>>(null);

  // The list is never taller than 45% of the screen (but always at least 5 rows), so there
  // is still room to see the page, and the keyboard doesn't push it off the screen.
  const maxHeight = Math.max(ROW_HEIGHT * 5, Math.round(screenHeight * 0.45));

  // Every time the matches change (you typed another letter), jump back to the top, so the
  // best match is always the first thing you see.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [suggestions]);

  return (
    // A solid background, a thin outline and a shadow make the list look like it is
    // floating above the page instead of being part of it.
    <ThemedView
      type="background"
      style={[styles.list, { borderColor: theme.backgroundSelected, maxHeight }]}>
      {/* How many cards match, so you know how far the scrolling goes. */}
      <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
        {suggestions.length.toLocaleString()} {suggestions.length === 1 ? 'match' : 'matches'}
      </ThemedText>

      <FlatList
        ref={listRef}
        data={suggestions}
        // "handled" means tapping a name works even while the keyboard is open.
        keyboardShouldPersistTaps="handled"
        // Each row needs a unique label. A few cards share a name, so the position is added.
        keyExtractor={(name, index) => `${name}-${index}`}
        // The list's size tricks: fixed row height, and only a small window of rows drawn.
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        initialNumToRender={12}
        windowSize={7}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            // The first row (the best match) gets a light highlight.
            style={[styles.item, index === 0 && { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" numberOfLines={1}>
              {item}
            </ThemedText>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // The rounded bar holding the text field and the clear button.
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  // The text field fills the bar.
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.three,
    // On the web, remove the browser's default outline box around the text field.
    outlineStyle: 'none',
  } as object,
  // The floating list: rounded, outlined, with a soft shadow underneath.
  list: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
    // Shadow for iOS and web...
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    // ...and the equivalent for Android.
    elevation: 12,
  },
  // The "1,234 matches" line above the list.
  count: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  // One suggestion row, ROW_HEIGHT tall with the name centered up and down.
  item: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
});
