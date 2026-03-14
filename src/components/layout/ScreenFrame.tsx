import type { PropsWithChildren } from 'react';

type ScreenFrameProps = PropsWithChildren<{
  fill?: boolean;
}>;

export function ScreenFrame({ children, fill = false }: ScreenFrameProps) {
  return (
    <div className="screen-shell">
      <div className="screen-shell__background" />
      <main className={`screen-shell__content ${fill ? 'screen-shell__content--fill' : ''}`}>{children}</main>
    </div>
  );
}
