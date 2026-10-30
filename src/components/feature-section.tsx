import { StyleSheet, View } from 'react-native';

import { RichText } from '@/components/rich-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// One box on the Features page: a heading, then a list of short tips under it.
// Each tip has a bold name (what you can do) and a sentence saying how to do it.
// The sentences can contain symbols in braces, like {H} or {W}, which are swapped for
// Scryfall's pictures (see rich-text.tsx).
//
//   title - the heading of the box
//   tips  - the list of tips: { name, text }
export function FeatureSection({
  title,
  tips,
}: {
  title: string;
  tips: { name: string; text: string }[];
}) {
  return (
    // The rounded box behind the whole section.
    <ThemedView type="backgroundElement" style={styles.box}>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>

      {/* One block per tip, with a little space between them. */}
      {tips.map((tip) => (
        <View key={tip.name} style={styles.tip}>
          <ThemedText type="smallBold">{tip.name}</ThemedText>
          <RichText>{tip.text}</RichText>
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // The rounded box.
  box: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  // The section heading, a little smaller than the page title.
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  // One tip: its name, then its explanation just below.
  tip: {
    gap: Spacing.half,
  },
});
