'use client';
import { createPressable } from '@gluestack-ui/core/pressable/creator';
import { tva, type VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import React from 'react';
import { Pressable as RNPressable } from 'react-native';

const UIPressable = createPressable({ Root: RNPressable });

const pressableStyle = tva({
  base: 'data-[disabled=true]:opacity-40 data-[active=true]:opacity-20',
});

type IPressableProps = React.ComponentPropsWithoutRef<typeof UIPressable> &
  VariantProps<typeof pressableStyle> & { className?: string };

const Pressable = React.forwardRef<
  React.ComponentRef<typeof UIPressable>,
  IPressableProps
>(function Pressable({ className, ...props }, ref) {
  return (
    <UIPressable
      className={pressableStyle({ class: className })}
      {...props}
      ref={ref}
    />
  );
});

Pressable.displayName = 'Pressable';
export { Pressable };
