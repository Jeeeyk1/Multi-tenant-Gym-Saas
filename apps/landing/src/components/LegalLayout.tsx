import { Navbar } from './Navbar';
import { Footer } from './Footer';

export function LegalLayout({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main id="main" className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-ink tracking-heading">{title}</h1>
        <p className="text-sm text-ink-secondary mt-2">Effective {effectiveDate}</p>

        <div
          className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mb-3
            [&_p]:mb-3 [&_p]:text-ink-secondary
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:text-ink-secondary [&_ul]:mb-3
            [&_strong]:text-ink [&_strong]:font-medium
            [&_a]:text-code [&_a]:hover:underline"
        >
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
