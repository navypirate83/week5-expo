import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { CardData, Ruling } from '@/services/scryfall';

// Everything shown for the chosen card, top to bottom:
//   1. the picture of the card
//   2. the card's text (name, type, rules text)
//   3. the official rulings
// This component only displays what it is given. useCardDetails fetches the data.
export function CardView({
  card,
  rulings,
  fromSaved,
}: {
  card: CardData;
  rulings: Ruling[];
  fromSaved: boolean;
}) {
  return (
    <View style={styles.container}>
      {/* A small note shown only when we couldn't reach the internet and are showing a saved copy. */}
      {fromSaved && (
        <ThemedText type="small" themeColor="textSecondary">
          Offline: showing the saved copy of this card.
        </ThemedText>
      )}

      {/* 1. THE CARD PICTURE(S). Double-sided cards show both sides, one above the other. */}
      {card.imageUrls.map((url) => (
        <Image
          key={url}
          source={{ uri: url }}
          // Every Magic card is the same shape, so reserve the right amount of space
          // before the picture arrives and the page doesn't jump around.
          style={styles.image}
          contentFit="contain"
          // Keep downloaded pictures on the phone so they show again quickly (and offline).
          cachePolicy="disk"
          accessibilityLabel={`Picture of ${card.name}`}
        />
      ))}

      {/* 2. THE CARD TEXT: one block per face (most cards have just one). */}
      <ThemedView type="backgroundElement" style={styles.panel}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          CARD TEXT
        </ThemedText>
        {card.faces.map((face, index) => (
          <View key={`${face.name}-${index}`} style={styles.face}>
            <ThemedText type="subtitle" style={styles.cardName}>
              {face.name}
            </ThemedText>
            {/* The mana cost, with each {2}{W} swapped for its symbol (a bit larger than in the text). */}
            {face.manaCost !== '' && <RichText size={24}>{face.manaCost}</RichText>}
            <ThemedText type="smallBold">{face.typeLine}</ThemedText>
            {/* The rules text, with symbols like {T} and {1} swapped for their pictures. */}
            {face.oracleText !== '' && <RichText>{face.oracleText}</RichText>}
            {face.stats !== '' && <ThemedText type="smallBold">{face.stats}</ThemedText>}
          </View>
        ))}
      </ThemedView>

      {/* 3. THE RULINGS: official answers to "how does this card work?" questions. */}
      <ThemedView type="backgroundElement" style={styles.panel}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          RULINGS
        </ThemedText>
        {rulings.length === 0 ? (
          <ThemedText themeColor="textSecondary">There are no official rulings for this card.</ThemedText>
        ) : (
          rulings.map((ruling, index) => (
            <View key={index} style={styles.ruling}>
              <ThemedText type="small" themeColor="textSecondary">
                {ruling.publishedAt}
              </ThemedText>
              <RichText>{ruling.comment}</RichText>
            </View>
          ))
        )}
      </ThemedView>
    </View>
  );
}

// A card back, shown in the picture's spot when no card has been chosen yet. It is a simple
// placeholder drawn for this app (not official game artwork).
// The picture file is saved inside the app (assets/images/card-back.png), so it
// shows even with no internet.
export function CardBack() {
  return (
    <Image
      source={require('@/assets/images/card-back.png')}
      style={styles.image}
      contentFit="contain"
      accessibilityLabel="The back of a Magic card"
    />
  );
}

// A spinner shown while a card is being fetched for the first time.
export function CardLoading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  // The three sections stacked with space between them.
  container: {
    gap: Spacing.three,
  },
  // The card picture. 488 x 680 is the real shape of a Magic card.
  image: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 488 / 680,
    alignSelf: 'center',
  },
  // The rounded boxes behind the card text and the rulings.
  panel: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  // One card face's text, with a little space between its lines.
  face: {
    gap: Spacing.one,
  },
  cardName: {
    fontSize: 24,
    lineHeight: 32,
  },
  // One ruling: its date, then the text.
  ruling: {
    gap: Spacing.half,
    paddingTop: Spacing.one,
  },
  // Centers the spinner with some space around it.
  loading: {
    padding: Spacing.five,
    alignItems: 'center',
  },
});
