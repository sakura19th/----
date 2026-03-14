import type { PropsWithChildren } from 'react';

export function ScreenFrame({ children }: PropsWithChildren) {
  return (
    <div className="screen-shell">
      <div className="screen-shell__background" />
      <main className="screen-shell__content">{children}</main>
    </div>
  );
}
