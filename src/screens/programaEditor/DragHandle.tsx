import React, { useRef } from 'react';
import { PanResponder, Platform, StyleProp, View, ViewStyle } from 'react-native';

type Props = {
  onDragStart: (pageY: number) => void;
  onDragMove: (dy: number, pageY: number) => void;
  onDragEnd: () => void;
  /** Toque sin arrastrar. */
  onTap?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: React.ReactNode;
};

/** Agarradera: se arrastra con el dedo o el ratón; un toque llama a onTap. */
export default function DragHandle({ onDragStart, onDragMove, onDragEnd, onTap, style, accessibilityLabel, children }: Props) {
  const cb = useRef({ onDragStart, onDragMove, onDragEnd, onTap });
  cb.current = { onDragStart, onDragMove, onDragEnd, onTap };
  const dragging = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => !dragging.current,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => { dragging.current = false; },
      onPanResponderMove: (_e, g) => {
        if (!dragging.current) {
          if (Math.abs(g.dy) < 4) return;
          dragging.current = true;
          cb.current.onDragStart(g.y0);
        }
        cb.current.onDragMove(g.dy, g.moveY);
      },
      onPanResponderRelease: () => {
        if (dragging.current) cb.current.onDragEnd();
        else cb.current.onTap?.();
        dragging.current = false;
      },
      onPanResponderTerminate: () => {
        if (dragging.current) cb.current.onDragEnd();
        dragging.current = false;
      },
    })
  ).current;

  return (
    <View
      {...pan.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[style, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab', userSelect: 'none' } as any) : null]}
    >
      {children}
    </View>
  );
}
