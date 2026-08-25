'use client';
import React from 'react';
import { View, Text, type ViewProps, type TextProps } from 'react-native';
import { createToast, createToastHook } from '@gluestack-ui/core/toast/creator';
import { tva, useStyleContext, withStyleContext, type VariantProps } from '@gluestack-ui/utils/nativewind-utils';

const SCOPE = 'TOAST';

export const useToast = createToastHook(View);

const Root = withStyleContext(View, SCOPE);
const UIToast = createToast({ Root, Title: Text, Description: Text });

const toastStyle = tva({
  base: 'p-4 rounded-md gap-1 mx-4',
  variants: {
    action: {
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-destructive',
      info: 'bg-info',
      muted: 'bg-card border border-border',
    },
  },
});

const toastTitleStyle = tva({
  base: 'font-sans font-semibold text-sm',
  parentVariants: {
    action: {
      success: 'text-success-foreground',
      warning: 'text-warning-foreground',
      error: 'text-destructive-foreground',
      info: 'text-info-foreground',
      muted: 'text-foreground',
    },
  },
});

const toastDescriptionStyle = tva({
  base: 'font-sans text-xs mt-0.5',
  parentVariants: {
    action: {
      success: 'text-success-foreground',
      warning: 'text-warning-foreground',
      error: 'text-destructive-foreground',
      info: 'text-info-foreground',
      muted: 'text-muted-foreground',
    },
  },
});

type IToastProps = ViewProps &
  VariantProps<typeof toastStyle> & { className?: string };

const Toast = React.forwardRef<React.ComponentRef<typeof UIToast>, IToastProps>(
  ({ className, action = 'muted', ...props }, ref) => {
    return (
      <UIToast
        ref={ref}
        {...props}
        context={{ action }}
        className={toastStyle({ action, class: className })}
      />
    );
  }
);

type IToastTitleProps = TextProps &
  VariantProps<typeof toastTitleStyle> & { className?: string };

const ToastTitle = React.forwardRef<React.ComponentRef<typeof UIToast.Title>, IToastTitleProps>(
  ({ className, ...props }, ref) => {
    const { action: parentAction } = useStyleContext(SCOPE);
    return (
      <UIToast.Title
        ref={ref}
        {...props}
        className={toastTitleStyle({ parentVariants: { action: parentAction }, class: className })}
      />
    );
  }
);

type IToastDescriptionProps = TextProps &
  VariantProps<typeof toastDescriptionStyle> & { className?: string };

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof UIToast.Description>,
  IToastDescriptionProps
>(({ className, ...props }, ref) => {
  const { action: parentAction } = useStyleContext(SCOPE);
  return (
    <UIToast.Description
      ref={ref}
      {...props}
      className={toastDescriptionStyle({ parentVariants: { action: parentAction }, class: className })}
    />
  );
});

Toast.displayName = 'Toast';
ToastTitle.displayName = 'ToastTitle';
ToastDescription.displayName = 'ToastDescription';

export { Toast, ToastTitle, ToastDescription };
