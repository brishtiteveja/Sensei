import { useLayoutEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * A single LaTeX span, rendered by KaTeX into a ref.
 *
 * We render into a ref (not `katex.renderToString` + innerHTML) so RichText's
 * "no dangerouslySetInnerHTML anywhere" invariant survives the addition of
 * math. `throwOnError: false` means a malformed expression from the model
 * degrades to its red source text instead of taking down the whole message.
 *
 * KaTeX draws with the current text colour, so it inherits the bubble's ink in
 * both themes for free. The fonts are bundled from the npm package into
 * `dist/assets` at build time — nothing is fetched from a CDN, so the
 * "no third-party requests" promise holds.
 */
export function Math({ latex, display = false }: { latex: string; display?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      katex.render(latex, el, {
        displayMode: display,
        throwOnError: false,
        // The tutor writes chemistry (H_2O) and physics; be lenient about the
        // stray control sequences a model invents rather than failing the span.
        strict: false,
        output: 'htmlAndMathml',
      });
    } catch {
      // throwOnError:false already handles parse errors; this only fires on a
      // truly unexpected fault, in which case show the raw source.
      el.textContent = latex;
    }
  }, [latex, display]);

  // Display math sits on its own centred line; inline flows with the text.
  return (
    <span
      ref={ref}
      className={display ? 'my-1 block overflow-x-auto text-center' : undefined}
      // Fallback text before the effect runs (and if JS somehow never does).
    >
      {latex}
    </span>
  );
}
