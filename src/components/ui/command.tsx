'use client';

import * as React from 'react';
import {
  Command as CmdkRoot,
  CommandDialog as CmdkDialog,
  CommandInput as CmdkInput,
  CommandList as CmdkList,
  CommandEmpty as CmdkEmpty,
  CommandGroup as CmdkGroup,
  CommandItem as CmdkItem,
} from 'cmdk';
import { cn } from '@/lib/utils';

const Command = React.forwardRef<
  React.ElementRef<typeof CmdkRoot>,
  React.ComponentPropsWithoutRef<typeof CmdkRoot>
>(({ className, ...props }, ref) => (
  <CmdkRoot
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
));
Command.displayName = 'Command';

const CommandDialog = ({
  contentClassName,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof CmdkDialog>) => (
  <CmdkDialog
    overlayClassName={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm', overlayClassName)}
    contentClassName={cn(
      'fixed left-[50%] top-[50%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-3xl border-0 bg-card/95 p-0 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:bg-card/90 dark:ring-white/10',
      contentClassName
    )}
    {...props}
  />
);

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CmdkInput>,
  React.ComponentPropsWithoutRef<typeof CmdkInput>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <CmdkInput
      ref={ref}
      className={cn(
        'flex h-12 w-full rounded-xl bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  React.ElementRef<typeof CmdkList>,
  React.ComponentPropsWithoutRef<typeof CmdkList>
>(({ className, ...props }, ref) => (
  <CmdkList
    ref={ref}
    className={cn('max-h-[320px] overflow-y-auto overflow-x-hidden p-2', className)}
    {...props}
  />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CmdkEmpty>,
  React.ComponentPropsWithoutRef<typeof CmdkEmpty>
>(({ className, ...props }, ref) => (
  <CmdkEmpty ref={ref} className={cn('py-6 text-center text-sm text-muted-foreground', className)} {...props} />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CmdkGroup>,
  React.ComponentPropsWithoutRef<typeof CmdkGroup>
>(({ className, ...props }, ref) => (
  <CmdkGroup ref={ref} className={cn('overflow-hidden p-1 text-foreground', className)} {...props} />
));
CommandGroup.displayName = 'CommandGroup';

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CmdkItem>,
  React.ComponentPropsWithoutRef<typeof CmdkItem>
>(({ className, ...props }, ref) => (
  <CmdkItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};
