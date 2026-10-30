import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardBack, CardLoading, CardView } from '@/components/card-view';
import { CardSearchBox, CardSuggestions } from '@/components/card-search-box';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCardDetails } from '@/hooks/use-card-details';
import { useCardNames } from '@/hooks/use-card-names';
import { buildIndex, searchCardNames } from '@/lib/card-search';

// The Card Rulings screen (the card tab).
// Top to bottom: search box -> card picture -> card text -> rulings.
// The list of matching names floats ON TOP of the picture, like a real dropdown.
export default function CardsScreen() {
  // The list of every card name, kept on the phone and refreshed from Scryfall when online.
  const { names, status: namesStatus, updating, error: namesError, retry } = useCardNames();

  // Getting the list ready for fast searching is slow-ish (35,000 names), so we do it
  // once when the list arrives, not on every keystroke.
  const index = useMemo(() => buildIndex(names), [names]);

  // "query" is what's typed in the box. "selected" is the card whose details are shown.
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  // Whether the list of suggestions should be showing (hidden after you pick a card or tap away).
  const [showSuggestions, setShowSuggestions] = useState(false);
  // How tall the search bar is, measured once it appears. The floating list starts just below it.
  const [searchBarHeight, setSearchBarHeight] = useState(0);

  // ALL the matching names for what's typed, best first (Infinity = no limit). The dropdown
  // scrolls, so every match is reachable. Recalculated only when typing or the list changes.
  const suggestions = useMemo(
    () => (showSuggestions ? searchCardNames(index, query, Infinity) : []),
    [index, query, showSuggestions],
  );

  // Fetches the text, picture and rulings for the selected card.
  const details = useCardDetails(selected);

  // Called on each keystroke.
  function handleChangeQuery(text: string) {
    setQuery(text);
    setShowSuggestions(text.trim().length > 0);
    // An empty box means no card is searched, so go back to showing the card back.
    if (text.trim() === '') setSelected(null);
  }

  // Called when a name is tapped in the list (or Enter is pressed).
  function handleSelect(name: string) {
    setSelected(name);
    setQuery(name);
    setShowSuggestions(false);
  }

  return (
    // The full-screen background.
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* THE SEARCH BOX. It sits above the scrolling area, so it stays at the top of the
            screen while you scroll through a card's rulings. onLayout reports its height. */}
        <View
          style={styles.searchBar}
          onLayout={(event) => setSearchBarHeight(event.nativeEvent.layout.height)}>
          <CardSearchBox
            query={query}
            firstMatch={suggestions[0]}
            disabled={namesStatus !== 'ready'}
            onChangeQuery={handleChangeQuery}
            onSelect={handleSelect}
          />
        </View>

        {/* ScrollView lets the page scroll, since a card plus its rulings is tall.
            "handled" means a tap on a suggestion works even while the keyboard is open. */}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Messages about the card list: loading it for the first time, or it couldn't be downloaded. */}
          {namesStatus === 'loading' && (
            <ThemedText themeColor="textSecondary">Loading the card list...</ThemedText>
          )}
          {namesStatus === 'empty' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>
                The card list hasn&apos;t been downloaded yet. Connect to the internet and try again.
              </ThemedText>
              {namesError && (
                <ThemedText type="small" themeColor="textSecondary">
                  {namesError}
                </ThemedText>
              )}
              <Pressable onPress={retry} accessibilityRole="button">
                <ThemedText type="linkPrimary">Try again</ThemedText>
              </Pressable>
            </ThemedView>
          )}
          {updating && namesStatus === 'ready' && (
            <ThemedText type="small" themeColor="textSecondary">
              Checking for new cards...
            </ThemedText>
          )}

          {/* WHAT'S BELOW THE BOX depends on the state of the lookup. */}
          {/* No card chosen yet: show the back of a card where the picture will go. */}
          {selected === null && <CardBack />}
          {details.status === 'loading' && <CardLoading />}
          {details.status === 'error' && (
            <ThemedView type="backgroundElement" style={styles.notice}>
              <ThemedText>Couldn&apos;t load {selected}.</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {details.error}
              </ThemedText>
            </ThemedView>
          )}
          {details.status === 'ready' && details.card && (
            <CardView card={details.card} rulings={details.rulings} fromSaved={details.fromSaved} />
          )}
        </ScrollView>

        {/* THE FLOATING DROPDOWN. It is drawn after (so on top of) the scrolling area and
            positioned just under the search bar. Two layers, only while there are matches: */}
        {suggestions.length > 0 && (
          <>
            {/* 1. An invisible layer over the whole page below the search bar. Tapping anywhere
                   on it closes the list, the way tapping outside a real dropdown does. */}
            <Pressable
              onPress={() => setShowSuggestions(false)}
              accessibilityLabel="Close suggestions"
              style={[styles.backdrop, { top: searchBarHeight }]}
            />
            {/* 2. The list itself, floating over the card picture and text. */}
            <View style={[styles.dropdown, { top: searchBarHeight }]}>
              <CardSuggestions suggestions={suggestions} onSelect={handleSelect} />
            </View>
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Fill the screen and center the content column on wide screens (like a browser).
  container: {
    flex: 1,
    alignItems: 'center',
  },
  // The column is never wider than MaxContentWidth, so it stays readable on big screens.
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  // Space around the search box.
  searchBar: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  // Space around everything in the scrolling area.
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  // The rounded box used for "couldn't load" style messages.
  notice: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  // The invisible tap-to-close layer: covers everything from just below the search bar to the bottom.
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Where the floating list sits: pinned under the search bar, lined up with the box's edges.
  // "zIndex" and "elevation" make sure it is drawn above the page content.
  dropdown: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 10,
    elevation: 12,
  },
});
